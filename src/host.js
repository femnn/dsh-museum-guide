// 博物馆导游辅助器 —— Host 半片。
//
// 职责：逐字稿项目的建档、展厅分段、资料与地图记录、字数审核（确定性计数）、
// 终稿导出，以及给侧边栏面板读写的 /api/museum-guide 路由。
// 研究与写作由会话里的 Agent 完成；这里保证「地图先行、逐厅写作、字数达标」不被糊弄。
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const name = 'museum-guide'
export { parseMapText }
export const inject = ['webServer', 'connection']

const API_PREFIX = '/api/museum-guide'
const PROJECT_ID_RE = /^[a-z0-9]{8,24}$/

const DEFAULTS = {
  targetChars: 22000,
  minChars: 20000,
  introMaxChars: 1300,
  charsPerMinute: 240,
}

/* ------------------------------------------------------------------ *
 * 存储
 * ------------------------------------------------------------------ */

function rootOf(config) {
  const raw = config && typeof config.dataDir === 'string' ? config.dataDir.trim() : ''
  return raw ? raw.replace(/^~(?=$|[\\/])/, homedir()) : join(homedir(), '.dsh', 'museum-guide')
}

async function ensureDirs(config) {
  const root = rootOf(config)
  await mkdir(join(root, 'projects'), { recursive: true })
  await mkdir(join(root, 'exports'), { recursive: true })
  return root
}

function projectPath(config, id) {
  if (!PROJECT_ID_RE.test(String(id || ''))) throw new Error('项目 id 不合法')
  return join(rootOf(config), 'projects', `${id}.json`)
}

async function readProject(config, id) {
  const text = await readFile(projectPath(config, id), 'utf8')
  return JSON.parse(text)
}

async function writeProject(config, project) {
  await ensureDirs(config)
  project.updatedAt = new Date().toISOString()
  await writeFile(projectPath(config, project.id), JSON.stringify(project, null, 2), 'utf8')
  return project
}

async function listProjects(config) {
  await ensureDirs(config)
  const dir = join(rootOf(config), 'projects')
  const names = await readdir(dir).catch(() => [])
  const out = []
  for (const file of names) {
    if (!file.endsWith('.json')) continue
    try {
      const project = JSON.parse(await readFile(join(dir, file), 'utf8'))
      out.push(project)
    } catch {
      /* 单个坏文件不影响列表 */
    }
  }
  out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return out
}

/* ------------------------------------------------------------------ *
 * 字数与审核
 * ------------------------------------------------------------------ */

function countChars(text) {
  let n = 0
  for (const ch of String(text || '')) {
    if (/\s/.test(ch)) continue
    n += 1
  }
  return n
}

function countWords(text) {
  const s = String(text || '')
  const cjk = s.match(/[\u3400-\u9fff\uf900-\ufaff]/g)
  const latin = s.match(/[A-Za-z]+|\d+(?:\.\d+)?/g)
  return (cjk ? cjk.length : 0) + (latin ? latin.length : 0)
}

function totalText(project) {
  return (project.sections || []).map(section => section.text || '').join('\n')
}

function normalizeVideo(item) {
  const url = String(item && item.url || '').trim()
  const title = String(item && item.title || '').trim()
  const platform = String(item && item.platform || 'other').trim()
  const note = String(item && item.note || '').trim()
  if (!url && !title) return null
  return { platform, title, url, note }
}

function mergeVideos(current, incoming) {
  const out = Array.isArray(current) ? current.slice() : []
  const seen = new Set(out.map(item => `${item.url}|${item.title}`))
  for (const raw of incoming || []) {
    const item = normalizeVideo(raw)
    if (!item) continue
    const key = `${item.url}|${item.title}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function sectionChars(section) {
  return countChars(section && section.text)
}

function audit(project, config) {
  const cfg = { ...DEFAULTS, ...(config || {}) }
  const sections = project.sections || []
  const halls = sections.filter(section => section.kind === 'hall')
  const intro = sections.find(section => section.kind === 'intro')
  const text = totalText(project)
  const total = countChars(text)
  const introChars = intro ? countChars(intro.text) : 0
  const exhibits = new Set()
  for (const section of sections) {
    for (const item of section.exhibits || []) {
      const key = String(item || '').trim()
      if (key) exhibits.add(key)
    }
  }
  const tail = text.slice(-600)
  const flags = []
  const push = (level, code, message) => flags.push({ level, code, message })

  if (!project.map || !project.map.title) {
    push('error', 'map-missing', '还没有记录地图/导览路线。先找官方导览图或参观手册，再动笔。')
  }
  if (!(project.research || []).length) {
    push('warn', 'research-empty', '还没有记录检索资料。至少补几条网页与短视频/笔记来源。')
  }
  if (halls.length < 3) {
    push('error', 'halls-too-few', `目前只有 ${halls.length} 个展厅模块，至少按展厅分成 3 段。`)
  }
  if (!intro) {
    push('warn', 'intro-missing', '没有开场段。开场控制在 5 分钟以内（约 1200 字），其余从简。')
  } else if (introChars > cfg.introMaxChars) {
    push('warn', 'intro-too-long', `开场 ${introChars} 字，超过 ${cfg.introMaxChars} 字（约 5 分钟）。压缩开场。`)
  }
  if (/总结|结语|结束语|综上|感谢聆听|谢谢大家|就讲到这里|今天的讲解到此/.test(tail)) {
    push('error', 'summary-ending', '结尾出现了总结/致谢式收束。讲完最后一个展厅就停，不要总结。')
  }
  if (/互动|提问|请回答|举手|跟我念|有奖问答/.test(text)) {
    push('error', 'interaction', '文中出现互动设计。要求是纯讲述、不互动。')
  }
  const shortfall = Math.max(0, cfg.minChars - total)
  if (shortfall > 0) {
    push('error', 'below-minimum', `还差 ${shortfall} 字才到下限 ${cfg.minChars} 字（目标 ${cfg.targetChars}）。`)
  } else if (total < cfg.targetChars) {
    push('warn', 'below-target', `已过下限，距目标 ${cfg.targetChars} 字还差 ${cfg.targetChars - total} 字。`)
  }

  const errors = flags.filter(flag => flag.level === 'error')
  const verdict = errors.length ? 'fail' : (total < cfg.targetChars ? 'pass-below-target' : 'pass')

  return {
    verdict,
    pass: errors.length === 0,
    totalChars: total,
    totalWords: countWords(text),
    targetChars: cfg.targetChars,
    minChars: cfg.minChars,
    shortfall,
    minutes: Math.round((total / cfg.charsPerMinute) * 10) / 10,
    halls: halls.length,
    sections: sections.length,
    exhibits: exhibits.size,
    exhibitsList: [...exhibits],
    research: (project.research || []).length,
    mapRecorded: Boolean(project.map && project.map.title),
    floors: (project.map && Array.isArray(project.map.floors)) ? project.map.floors.length : 0,
    introChars,
    introMaxChars: cfg.introMaxChars,
    flags,
    perSection: sections.map(section => ({
      id: section.id,
      kind: section.kind,
      title: section.title,
      chars: sectionChars(section),
      exhibits: (section.exhibits || []).length,
      videos: (section.videos || []).length,
      preview: String(section.text || '').slice(0, 80),
    })),
  }
}

function summaryOf(project, config) {
  const result = audit(project, config)
  return {
    id: project.id,
    museum: project.museum,
    city: project.city || '',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    totalChars: result.totalChars,
    targetChars: result.targetChars,
    minChars: result.minChars,
    verdict: result.verdict,
    pass: result.pass,
    halls: result.halls,
    exhibits: result.exhibits,
    mapRecorded: result.mapRecorded,
    research: result.research,
    videos: (project.sections || []).reduce((n, section) => n + ((section.videos || []).length), 0),
    floors: result.floors,
  }
}

/* ------------------------------------------------------------------ *
 * 项目与分段
 * ------------------------------------------------------------------ */

function slugOf(museum) {
  return String(museum || 'museum').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40)
}

function createProject(config, input) {
  const cfg = { ...DEFAULTS, ...(config || {}) }
  const museum = String(input.museum || '').trim()
  if (!museum) throw new Error('缺少博物馆名称')
  const now = new Date().toISOString()
  return {
    id: randomUUID().replace(/-/g, '').slice(0, 12),
    museum,
    city: String(input.city || '').trim(),
    createdAt: now,
    updatedAt: now,
    targetChars: Number(input.targetChars) > 0 ? Math.round(Number(input.targetChars)) : cfg.targetChars,
    minChars: Number(input.minChars) > 0 ? Math.round(Number(input.minChars)) : cfg.minChars,
    map: null,
    research: [],
    sections: [],
    notes: String(input.notes || '').trim(),
  }
}

function upsertSection(project, input) {
  const kind = input.kind === 'intro' ? 'intro' : 'hall'
  const title = String(input.title || (kind === 'intro' ? '开场' : '')).trim()
  if (kind === 'hall' && !title) throw new Error('展厅分段需要标题（展厅名/篇章名）')
  const sections = project.sections || []
  let section = null
  if (input.sectionId) {
    section = sections.find(item => item.id === input.sectionId) || null
    if (!section) throw new Error('分段不存在')
  } else if (kind === 'intro') {
    section = sections.find(item => item.kind === 'intro') || null
  } else {
    section = sections.find(item => item.kind === 'hall' && item.title === title) || null
  }
  const text = String(input.text || '')
  if (!section) {
    section = {
      id: `${kind === 'intro' ? 'intro' : 'h'}${sections.length + 1}`,
      kind,
      title,
      order: Number.isFinite(input.order) ? input.order : sections.length + 1,
      text: '',
      exhibits: [],
      videos: [],
      updatedAt: '',
    }
    sections.push(section)
  }
  if (text) section.text = text
  if (title && kind === 'hall') section.title = title
  if (Number.isFinite(input.order)) section.order = input.order
  if (Array.isArray(input.exhibits)) {
    const merged = new Set([...(section.exhibits || []), ...input.exhibits.map(v => String(v || '').trim()).filter(Boolean)])
    section.exhibits = [...merged]
  }
  if (Array.isArray(input.videos)) {
    section.videos = mergeVideos(section.videos, input.videos)
  }
  if (!Array.isArray(section.videos)) section.videos = []
  section.chars = sectionChars(section)
  section.updatedAt = new Date().toISOString()
  sections.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id)))
  project.sections = sections
  return project
}

function floorLevelOf(name, index) {
  const text = String(name || '')
  const underground = text.match(/B(\d+)/i) || text.match(/负\s*([\d一二三])/)
  if (underground) {
    const raw = underground[1]
    const map = { 一: 1, 二: 2, 三: 3 }
    return -(Number(map[raw] || raw) || 1)
  }
  if (/户外|室外|广场|下沉/.test(text)) return 0
  const chinese = text.match(/([一二三四五六七八九十])\s*层/)
  if (chinese) {
    const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
    return map[chinese[1]] || index
  }
  const above = text.match(/(\d)\s*[Ff层]?/)
  return above ? Number(above[1]) : index
}

// 极简地图格式：
//   一层
//   1 服务大厅 = 序厅
//   2 源起江南 = 江海共潮生 / 手铲释天书
function parseMapText(text) {
  const floors = []
  let current = null
  const lines = String(text || '').split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.includes('=')) {
      if (!current) {
        current = { name: '未标注楼层', level: 0, rooms: [] }
        floors.push(current)
      }
      const [left, right] = line.split('=')
      const halls = String(right || '').split(/[\/、,，]/).map(item => item.trim()).filter(Boolean)
      const leftText = left.trim()
      const matched = leftText.match(/^(\d+)\s*[.、]?\s*(.*)$/)
      current.rooms.push({
        no: matched ? matched[1] : String(current.rooms.length + 1),
        name: (matched ? matched[2] : leftText).trim() || `空间 ${current.rooms.length + 1}`,
        halls,
      })
      continue
    }
    const levelMatch = line.match(/^(B\d+|负[一二三\d]|户外|一层|二层|三层|\d+F?)$/i)
    const isFloor = !/^\d+\s/.test(line) && (levelMatch || /层|户外|广场/.test(line)) && line.length <= 8
    if (isFloor) {
      current = { name: line, level: floorLevelOf(line, floors.length), rooms: [] }
      floors.push(current)
      continue
    }
    const matched = line.match(/^(\d+)\s*[.、]?\s*(.*)$/)
    if (!current) {
      current = { name: '未标注楼层', level: 0, rooms: [] }
      floors.push(current)
    }
    current.rooms.push({
      no: matched ? matched[1] : String(current.rooms.length + 1),
      name: (matched ? matched[2] : line).trim(),
      halls: [],
    })
  }
  return floors
}

function renderMarkdown(project) {
  const sections = project.sections || []
  const lines = []
  lines.push(`# ${project.museum} 讲解逐字稿`)
  if (project.city) lines.push(`地点：${project.city}`)
  lines.push(`目标字数：${project.targetChars}　下限：${project.minChars}`)
  if (project.map && project.map.title) {
    lines.push(`导览依据：${project.map.title}${project.map.sourceUrl ? `（${project.map.sourceUrl}）` : ''}`)
  }
  lines.push('')
  for (const section of sections) {
    lines.push(section.kind === 'intro' ? '## 开场' : `## ${section.title}`)
    lines.push('')
    lines.push(String(section.text || '').trim())
    lines.push('')
    const videos = Array.isArray(section.videos) ? section.videos : []
    if (videos.length) {
      lines.push('讲解视频：')
      for (const video of videos) {
        const label = video.platform && video.platform !== 'other' ? `[${video.platform}] ` : ''
        lines.push(`- ${label}${video.title || '未命名'}${video.url ? `：${video.url}` : ''}`)
      }
      lines.push('')
    }
  }
  return `${lines.join('\n').trim()}\n`
}

/* ------------------------------------------------------------------ *
 * HTTP 工具
 * ------------------------------------------------------------------ */

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(payload)
}

function sendOk(res, value) {
  sendJson(res, 200, { ok: true, value })
}

function sendFail(res, status, error) {
  sendJson(res, status, { ok: false, error: String(error && error.message ? error.message : error) })
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  const value = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('请求体必须是 JSON 对象')
  return value
}

/* ------------------------------------------------------------------ *
 * 插件入口
 * ------------------------------------------------------------------ */

export function apply(ctx, config) {
  const cfg = { ...DEFAULTS, ...(config || {}) }

  /* ---------- /api/museum-guide ---------- */
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    handler: async (req, res) => {
      try {
        const rejection = typeof ctx.connection?.requestRejection === 'function'
          ? ctx.connection.requestRejection(req)
          : undefined
        if (rejection !== undefined) {
          sendFail(res, rejection, '未授权')
          return
        }
        const url = new URL(req.url || '/', 'http://localhost')
        const route = url.pathname.slice(API_PREFIX.length) || '/'
        const method = String(req.method || 'GET').toUpperCase()

        if (method === 'GET' && route === '/projects') {
          const projects = await listProjects(cfg)
          sendOk(res, projects.map(project => summaryOf(project, cfg)))
          return
        }

        if (method === 'GET' && route === '/project') {
          const id = url.searchParams.get('id') || ''
          const project = await readProject(cfg, id)
          sendOk(res, { ...project, audit: audit(project, cfg) })
          return
        }

        if (method === 'GET' && route === '/export') {
          const id = url.searchParams.get('id') || ''
          const project = await readProject(cfg, id)
          const markdown = renderMarkdown(project)
          const filename = `${slugOf(project.museum)}-讲解逐字稿.md`
          res.statusCode = 200
          res.setHeader('content-type', 'text/markdown; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
          res.end(markdown)
          return
        }

        if (method === 'POST' && route === '/project') {
          const body = await readJsonBody(req)
          const project = createProject(cfg, body)
          await writeProject(cfg, project)
          sendOk(res, { ...project, audit: audit(project, cfg) })
          return
        }

        if (method === 'POST' && route === '/section') {
          const body = await readJsonBody(req)
          const project = await readProject(cfg, body.id)
          upsertSection(project, body)
          await writeProject(cfg, project)
          sendOk(res, { ...project, audit: audit(project, cfg) })
          return
        }

        if (method === 'POST' && route === '/map') {
          const body = await readJsonBody(req)
          const project = await readProject(cfg, body.id)
          if (typeof body.text === 'string' && body.text.trim()) {
            const floors = parseMapText(body.text)
            if (!floors.length) throw new Error('地图格式没有解析出任何楼层')
            project.map = {
              ...(project.map || {}),
              title: String(body.title || (project.map && project.map.title) || `${project.museum} 导览图`).trim(),
              sourceUrl: String(body.sourceUrl || (project.map && project.map.sourceUrl) || '').trim(),
              imageUrl: String(body.imageUrl || (project.map && project.map.imageUrl) || '').trim(),
              floors,
              updatedAt: new Date().toISOString(),
            }
          } else {
            project.map = {
              ...(project.map || { title: `${project.museum} 导览图` }),
              imageUrl: String(body.imageUrl || '').trim(),
              updatedAt: new Date().toISOString(),
            }
          }
          await writeProject(cfg, project)
          sendOk(res, { ...project, audit: audit(project, cfg) })
          return
        }

        if (method === 'POST' && route === '/map-image') {
          const body = await readJsonBody(req)
          const project = await readProject(cfg, body.id)
          const match = String(body.dataUrl || '').match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/)
          if (!match) throw new Error('只支持 png / jpeg / webp / gif 图片')
          const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[match[1]]
          const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
          if (bytes.length > 12 * 1024 * 1024) throw new Error('图片太大，请压缩到 12MB 以内')
          const root = await ensureDirs(cfg)
          await mkdir(join(root, 'maps'), { recursive: true })
          const name = `${project.id}.${ext}`
          await writeFile(join(root, 'maps', name), bytes)
          project.map = {
            ...(project.map || { title: `${project.museum} 导览图` }),
            imageLocal: name,
            updatedAt: new Date().toISOString(),
          }
          await writeProject(cfg, project)
          sendOk(res, { ...project, audit: audit(project, cfg) })
          return
        }

        if (method === 'GET' && route === '/map-image') {
          const id = url.searchParams.get('id') || ''
          const project = await readProject(cfg, id)
          const name = project.map && project.map.imageLocal
          if (!name) { sendFail(res, 404, '没有上传导览图'); return }
          const root = rootOf(cfg)
          const file = join(root, 'maps', name)
          const bytes = await readFile(file)
          const type = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : name.endsWith('.gif') ? 'image/gif' : 'image/jpeg'
          res.statusCode = 200
          res.setHeader('content-type', type)
          res.setHeader('cache-control', 'private, max-age=600')
          res.end(bytes)
          return
        }

        if (method === 'POST' && route === '/delete') {
          const body = await readJsonBody(req)
          const path = projectPath(cfg, body.id)
          await unlink(path).catch(() => {})
          sendOk(res, { deleted: body.id })
          return
        }

        sendFail(res, 404, '接口不存在')
      } catch (error) {
        if (res.headersSent) {
          res.end()
          return
        }
        sendFail(res, error?.status || 500, error)
      }
    },
  }), 'dsh-museum-guide: /api/museum-guide routes')

  /* ---------- Agent 工具 ---------- */
  ctx.inject(['tools'], sctx => {
    const logo = (text) => [{ type: 'text', text }]

    const defs = [
      {
        name: 'museum_guide_start',
        description: '建立博物馆讲解逐字稿项目（一个博物馆一条）。返回 projectId 与写作规范；后续所有写入都用这个 projectId。用户给出博物馆名时第一步就调它。',
        parameters: {
          type: 'object',
          properties: {
            museum: { type: 'string', description: '博物馆全名，例如「苏州考古博物馆」' },
            city: { type: 'string', description: '城市，例如「苏州」' },
            targetChars: { type: 'number', description: '目标字数，默认 22000' },
            minChars: { type: 'number', description: '字数下限，默认 20000；低于它审核不通过' },
            notes: { type: 'string', description: '用户额外要求或本馆的特殊结构' },
            force: { type: 'boolean', description: '为 true 时才另建新项目；默认同一个博物馆名复用已有项目，避免重复建档' },
          },
          required: ['museum'],
        },
        output: {
          schema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              museum: { type: 'string' },
              targetChars: { type: 'number' },
              minChars: { type: 'number' },
              reused: { type: 'boolean' },
              total: { type: 'number' },
            },
            required: ['projectId'],
          },
          render: (_a, v) => logo(v.reused
            ? `已有「${v.museum}」的项目（projectId ${v.projectId}），接着往里写，不要另建。当前 ${v.total} / ${v.targetChars} 字。下一步：museum_guide_map 记录导览图与楼层，再逐厅写。`
            : `已建档：${v.museum}（projectId ${v.projectId}）。目标 ${v.targetChars} 字，下限 ${v.minChars} 字。下一步先用 museum_guide_map 记录导览图/路线与楼层，再检索资料。`),
        },
        async execute(args) {
          const input = args || {}
          const key = value => String(value || '').replace(/\s+/g, '').toLowerCase()
          if (!input.force) {
            const existing = (await listProjects(cfg)).find(project => key(project.museum) === key(input.museum))
            if (existing) {
              return {
                projectId: existing.id,
                museum: existing.museum,
                targetChars: existing.targetChars,
                minChars: existing.minChars,
                reused: true,
                total: countChars(totalText(existing)),
              }
            }
          }
          const project = createProject(cfg, input)
          await writeProject(cfg, project)
          return {
            projectId: project.id,
            museum: project.museum,
            targetChars: project.targetChars,
            minChars: project.minChars,
            reused: false,
            total: 0,
          }
        },
      },
      {
        name: 'museum_guide_map',
        description: '记录博物馆地图与参观路线：先找到官方导览图、参观手册/折页、官网展陈平面或公众号导览，再把展厅顺序记下来。写讲解稿前必须有这条记录。',
        parameters: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            title: { type: 'string', description: '地图名称，例如「苏州考古博物馆官方展陈平面（空间编号 1-7）」' },
            sourceUrl: { type: 'string', description: '地图来源链接（官网/公众号/手册电子版）' },
            route: { type: 'string', description: '推荐参观路线，按顺序写展厅名' },
            zones: {
              type: 'array',
              description: '地图上的展厅/空间清单，按顺序',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, floor: { type: 'string' }, note: { type: 'string' } },
                required: ['name'],
              },
            },
            stops: {
              type: 'array',
              description: '按参观顺序排列的路线节点（展厅级）。点了面板会直接显示这一厅的文字稿',
              items: {
                type: 'object',
                properties: {
                  no: { type: 'string' },
                  floor: { type: 'string' },
                  label: { type: 'string' },
                  note: { type: 'string' },
                  section: { type: 'string', description: '对应逐字稿的展厅标题（可只写前半段）' },
                },
                required: ['label'],
              },
            },
            floors: {
              type: 'array',
              description: '按楼层整理的展厅，用于面板里的分层立体图。一层/负一层/户外各一项；halls 按参观顺序写展厅名，与逐字稿的展厅标题对齐',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '楼层名，例如「一层」「负一层」「户外」' },
                  level: { type: 'number', description: '楼层序号：地面层为 1，地下层为 -1、-2，户外广场为 0' },
                  halls: { type: 'array', description: '这一层的展厅/空间，按顺序', items: { type: 'string' } },
                },
                required: ['name', 'halls'],
              },
            },
            note: { type: 'string', description: '地图获取情况说明（如只有现场折页、电子版缺失）' },
          },
          required: ['projectId', 'title'],
        },
        output: {
          schema: { type: 'object', properties: { projectId: { type: 'string' }, zones: { type: 'number' }, floors: { type: 'number' }, route: { type: 'string' } } },
          render: (_a, v) => logo(`地图已记录：${v.zones} 个空间、${v.floors} 层。路线：${v.route || '（未填写）'}。可以开始检索资料并逐厅写稿了。`),
        },
        async execute(args) {
          const project = await readProject(cfg, args.projectId)
          const floors = (Array.isArray(args.floors) ? args.floors : [])
            .map((floor, index) => {
              const rooms = (Array.isArray(floor && floor.rooms) ? floor.rooms : [])
                .map((room, roomIndex) => ({
                  no: String(room && room.no || roomIndex + 1),
                  name: String(room && room.name || '').trim(),
                  halls: (Array.isArray(room && room.halls) ? room.halls : []).map(name => String(name || '').trim()).filter(Boolean),
                }))
                .filter(room => room.name)
              return {
                name: String(floor && floor.name || '').trim(),
                level: Number.isFinite(floor && floor.level) ? Number(floor.level) : index,
                halls: (Array.isArray(floor && floor.halls) ? floor.halls : []).map(name => String(name || '').trim()).filter(Boolean),
                rooms,
              }
            })
            .filter(floor => floor.name)
          project.map = {
            title: String(args.title || '').trim(),
            sourceUrl: String(args.sourceUrl || '').trim(),
            route: String(args.route || '').trim(),
            zones: Array.isArray(args.zones) ? args.zones.filter(Boolean) : [],
            floors,
            stops: (Array.isArray(args.stops) ? args.stops : []).map((stop, index) => ({
              no: String(stop && stop.no || String(index + 1).padStart(2, '0')),
              floor: String(stop && stop.floor || '').trim(),
              label: String(stop && stop.label || '').trim(),
              note: String(stop && stop.note || '').trim(),
              section: String(stop && stop.section || '').trim(),
            })).filter(stop => stop.label),
            note: String(args.note || '').trim(),
            updatedAt: new Date().toISOString(),
          }
          await writeProject(cfg, project)
          return { projectId: project.id, zones: project.map.zones.length, floors: floors.length, route: project.map.route }
        },
      },
      {
        name: 'museum_guide_research',
        description: '记录一条检索资料：网页、官方通告、小红书笔记、抖音/快手/视频号视频、访谈或论文。每条写清可用故事点与涉及的展品，写稿时据此延展。',
        parameters: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            platform: { type: 'string', description: 'web | official | xiaohongshu | douyin | kuaishou | shipinhao | other' },
            title: { type: 'string' },
            url: { type: 'string' },
            takeaway: { type: 'string', description: '这条资料里能用的信息/故事点' },
            exhibits: { type: 'array', description: '涉及的展品名', items: { type: 'string' } },
          },
          required: ['projectId', 'platform', 'title'],
        },
        output: {
          schema: { type: 'object', properties: { total: { type: 'number' }, exhibits: { type: 'number' } } },
          render: (_a, v) => logo(`资料已记录（共 ${v.total} 条，涉及 ${v.exhibits} 件/组展品）。`),
        },
        async execute(args) {
          const project = await readProject(cfg, args.projectId)
          project.research = Array.isArray(project.research) ? project.research : []
          project.research.push({
            platform: String(args.platform || 'web'),
            title: String(args.title || '').trim(),
            url: String(args.url || '').trim(),
            takeaway: String(args.takeaway || '').trim(),
            exhibits: Array.isArray(args.exhibits) ? args.exhibits.map(v => String(v).trim()).filter(Boolean) : [],
            at: new Date().toISOString(),
          })
          await writeProject(cfg, project)
          const exhibits = new Set()
          for (const item of project.research) for (const exhibit of item.exhibits || []) exhibits.add(exhibit)
          return { total: project.research.length, exhibits: exhibits.size }
        },
      },
      {
        name: 'museum_guide_section',
        description: '写入一段逐字稿：kind=intro 写开场（≤1200 字），kind=hall 按展厅/篇章写一整段。同一标题重复调用会覆盖该段正文。文本中不要写总结、不要设计互动。',
        parameters: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            kind: { type: 'string', description: 'intro | hall' },
            title: { type: 'string', description: '展厅/篇章名，开场可留空' },
            order: { type: 'number', description: '展厅顺序，从 1 开始' },
            text: { type: 'string', description: '这一段的逐字稿正文（可直接照读）' },
            exhibits: { type: 'array', description: '本段讲到的展品名，用于覆盖率统计', items: { type: 'string' } },
            videos: {
              type: 'array',
              description: '这一厅的讲解视频/音频链接（B站、小红书、抖音、快手、视频号、官方），只写真实可打开的链接',
              items: {
                type: 'object',
                properties: {
                  platform: { type: 'string', description: 'bilibili | xiaohongshu | douyin | kuaishou | shipinhao | official | other' },
                  title: { type: 'string' },
                  url: { type: 'string' },
                  note: { type: 'string', description: '备注：时长、讲得好的点、是否官方' },
                },
                required: ['title'],
              },
            },
          },
          required: ['projectId', 'kind', 'text'],
        },
        output: {
          schema: { type: 'object', properties: { title: { type: 'string' }, chars: { type: 'number' }, total: { type: 'number' }, target: { type: 'number' } } },
          render: (_a, v) => logo(`已写入「${v.title}」${v.chars} 字；全文累计 ${v.total} / ${v.target} 字。`),
        },
        async execute(args) {
          const project = await readProject(cfg, args.projectId)
          upsertSection(project, args)
          await writeProject(cfg, project)
          const section = (project.sections || []).find(item => item.kind === 'intro'
            ? args.kind === 'intro'
            : item.title === String(args.title || '').trim())
          return {
            title: section ? section.title : String(args.title || ''),
            chars: section ? sectionChars(section) : 0,
            total: countChars(totalText(project)),
            target: project.targetChars,
          }
        },
      },
      {
        name: 'museum_guide_video',
        description: '给某个已写好的展厅挂一条讲解视频链接（B站、小红书、抖音、快手、视频号或官方）。只挂真实存在、能打开的链接；搜不到就不挂，不要编。',
        parameters: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            sectionTitle: { type: 'string', description: '展厅标题，与 museum_guide_section 里写的标题一致（可只写前半段）' },
            platform: { type: 'string', description: 'bilibili | xiaohongshu | douyin | kuaishou | shipinhao | official | other' },
            title: { type: 'string' },
            url: { type: 'string' },
            note: { type: 'string', description: '备注：时长、讲得好的点、是否官方' },
          },
          required: ['projectId', 'sectionTitle', 'title'],
        },
        output: {
          schema: { type: 'object', properties: { sectionTitle: { type: 'string' }, videos: { type: 'number' } } },
          render: (_a, v) => logo(`已给「${v.sectionTitle}」挂上视频，这一厅现在有 ${v.videos} 条。`),
        },
        async execute(args) {
          const project = await readProject(cfg, args.projectId)
          const wanted = String(args.sectionTitle || '').replace(/\s+/g, '')
          const sections = project.sections || []
          const section = sections.find(item => item.kind === 'hall' && String(item.title || '').replace(/\s+/g, '') === wanted)
            || sections.find(item => item.kind === 'hall' && wanted && (String(item.title || '').includes(wanted) || wanted.includes(String(item.title || ''))))
          if (!section) throw new Error(`没找到展厅「${args.sectionTitle}」，先写这一厅再挂视频`)
          section.videos = mergeVideos(section.videos, [{ platform: args.platform, title: args.title, url: args.url, note: args.note }])
          await writeProject(cfg, project)
          return { sectionTitle: section.title, videos: section.videos.length }
        },
      },
      {
        name: 'museum_guide_audit',
        description: '审核逐字稿：确定性统计总字数、分展厅字数、展品覆盖数，检查是否达到下限/目标、开场是否过长、有没有总结式结尾或互动设计、地图是否已记录。字数不够会给出还差多少字。',
        parameters: {
          type: 'object',
          properties: { projectId: { type: 'string' } },
          required: ['projectId'],
        },
        output: {
          schema: { type: 'object', properties: { pass: { type: 'boolean' }, totalChars: { type: 'number' }, shortfall: { type: 'number' }, verdict: { type: 'string' } } },
          render: (_a, v) => logo([
            `${v.pass ? '审核通过' : '审核未通过'}：${v.totalChars} 字（${v.verdict}）`,
            v.shortfall > 0 ? `还差 ${v.shortfall} 字达标。` : '',
            v.flags.length ? `问题：\n${v.flags.map(flag => `- [${flag.level}] ${flag.message}`).join('\n')}` : '没有发现问题。',
            `分展厅：\n${v.perSection.map(item => `- ${item.title}：${item.chars} 字`).join('\n') || '（还没有分段）'}`,
          ].filter(Boolean).join('\n')),
        },
        async execute(args) {
          const project = await readProject(cfg, args.projectId)
          return audit(project, cfg)
        },
      },
      {
        name: 'museum_guide_export',
        description: '把逐字稿导出成 Markdown 终稿文件，返回文件绝对路径与最终字数。交付前先跑一次 museum_guide_audit。',
        parameters: {
          type: 'object',
          properties: { projectId: { type: 'string' } },
          required: ['projectId'],
        },
        output: {
          schema: { type: 'object', properties: { path: { type: 'string' }, chars: { type: 'number' }, pass: { type: 'boolean' } } },
          render: (_a, v) => logo(`${v.pass ? '已导出' : '已导出，但未达标'}：${v.path}（${v.chars} 字）`),
        },
        async execute(args) {
          const project = await readProject(cfg, args.projectId)
          const root = await ensureDirs(cfg)
          const result = audit(project, cfg)
          const path = join(root, 'exports', `${project.id}-${slugOf(project.museum)}.md`)
          await writeFile(path, renderMarkdown(project), 'utf8')
          return { path, chars: result.totalChars, pass: result.pass }
        },
      },
      {
        name: 'museum_guide_projects',
        description: '列出已有的讲解稿项目及字数状态，用于接着上次的稿子继续写。',
        parameters: { type: 'object', properties: {} },
        output: {
          schema: { type: 'object', properties: { items: { type: 'array' } } },
          render: (_a, v) => logo(v.items.length
            ? v.items.map(item => `- ${item.museum}（${item.id}）：${item.totalChars}/${item.targetChars} 字，${item.halls} 厅，${item.pass ? '达标' : '未达标'}`).join('\n')
            : '还没有项目。用 museum_guide_start 建一个。'),
        },
        async execute() {
          const projects = await listProjects(cfg)
          return { items: projects.map(project => summaryOf(project, cfg)) }
        },
      },
    ]

    sctx.effect(() => {
      const disposers = []
      for (const def of defs) {
        try {
          disposers.push(sctx.tools.register(def))
        } catch (error) {
          console.error('[dsh-museum-guide] 工具注册失败', def.name, error)
        }
      }
      return () => {
        for (const dispose of disposers) {
          try { dispose() } catch { /* 已注销 */ }
        }
      }
    }, 'dsh-museum-guide: agent tools')
  })

  /* ---------- 写作规范（短，只在讲稿任务里起作用） ---------- */
  ctx.inject(['systemPrompt'], sctx => {
    sctx.effect(() => sctx.systemPrompt.section({
      name: 'museum-guide',
      order: 40,
      text: [
        '## 博物馆讲解逐字稿',
        '用户要求为某座博物馆写讲解稿、导游词或逐字稿时，按下面的流程走，不要直接开写：',
        '1. 先 museum_guide_projects 看有没有现成项目；museum_guide_start 建档时同名博物馆会自动复用，不要重复建。默认目标 22000 字、下限 20000 字。',
        '2. 先找地图：官网、官方导览手册/折页、公众号导览、展陈平面。用 museum_guide_map 记下展厅顺序，并尽量给出 floors（一到几层、每层有哪些厅），面板会画成分层立体图；只有现场折页、没有电子版时如实写明。',
        '3. 检索资料：网页之外要查小红书、抖音、快手、视频号、B站（用站内笔记/视频标题与文案检索），每条用 museum_guide_research 记下平台、链接和可用的故事点。',
        '4. 逐厅写作：museum_guide_section kind=hall，一厅一段，以展品为核心讲故事；全年龄、口语、可直接照读；不设计互动；不写结尾总结，讲完最后一个展厅就停。开场 ≤1200 字，交代清楚后立刻进厅。',
        '5. 每写完一厅，顺手搜这一厅的讲解视频（B站、小红书、抖音、视频号、官方直播回放都可以），用 museum_guide_video 挂到该厅；只挂真实可打开的链接，搜不到就留空，不要编。',
        '6. 每写完一厅跑 museum_guide_audit；不够字数就继续写没覆盖的展厅和展品，不要用空话灌水。',
        '7. 达标后 museum_guide_export 导出终稿，并在回复里给出字数与文件路径。',
      ].join('\n'),
    }), 'dsh-museum-guide: prompt section')
  })
}