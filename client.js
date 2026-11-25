// 博物馆导游辅助器 —— 浏览器半片（左侧栏「博物馆导游」面板）。
//
// 面板不负责写稿：它把 Agent 的建档、地图、资料和展厅分段摊开给你看，
// 并用 Host 的确定性计数显示「离两万字还差多少」。一键复制的启动指令把整套要求
// 一次性交给会话里的模型，免去每次重讲规则。
window.__ModuleLoader__.load({
  id: 'dsh-museum-guide',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo, useCallback } = React

    const PANEL_ID = 'museum-guide'
    let translateCtx = null

    /* ------------------------------------------------------------------ *
     * 文案
     * ------------------------------------------------------------------ */
    const ZH = {
      title: '博物馆导游辅助器',
      subtitle: '先找导览图，再按展厅写成可照读的逐字稿',
      newProject: '新建讲解稿',
      museum: '博物馆名称',
      museumPlaceholder: '例如：苏州考古博物馆',
      city: '城市',
      cityPlaceholder: '例如：苏州',
      target: '目标字数',
      create: '建档',
      creating: '建档中…',
      projects: '讲解稿',
      emptyList: '还没有讲解稿。先给一个博物馆名建档，然后在会话里让 Agent 开始写。',
      startPrompt: '复制启动指令',
      copied: '已复制，粘贴到输入框发送即可',
      copyFailed: '复制失败，请手动选择输入框里的指令',
      noSelection: '左侧选一份讲解稿，或新建一份',
      emptyTitle: '三步出一份讲解稿',
      step1: '① 在这里建档：填博物馆名，字数默认 22000、下限 20000。',
      step2: '② 复制启动指令发给会话里的 Agent：它会先找官方导览图，再查网页和小红书 / 抖音 / 快手 / 视频号。',
      step3: '③ 写完后回来看「审核」「地图」「逐字稿」：字数、分层立体图、每厅视频和结尾检查都在这里，没过就让它接着补。',
      mapMissing: '还没记录导览图',
      mapReady: '导览图已记录',
      words: '字',
      targetWords: '目标',
      halls: '展厅',
      exhibits: '展品',
      sources: '资料',
      progress: '进度',
      shortfall: '还差',
      reached: '已达下限',
      pass: '达标',
      fail: '未达标',
      belowTarget: '过线未达标',
      tabScript: '逐字稿',
      tabAudit: '审核',
      tabSources: '资料',
      tabMap: '地图',
      noSections: '还没有分段。让 Agent 用 museum_guide_section 逐厅写入。',
      sectionChars: '字',
      expand: '展开',
      collapse: '收起',
      copySection: '复制这段',
      copyAll: '复制全文',
      download: '下载 Markdown',
      delete: '删除',
      deleteAsk: '删除这份讲解稿？导出过的 Markdown 文件不会被删。',
      intro: '开场',
      auditVerdictPass: '审核通过：字数、展厅、地图与结尾检查都没问题。',
      auditVerdictFail: '审核未通过，下面列出的问题解决前不算完成。',
      auditEmpty: '还没有可审核的内容。',
      perSection: '分展厅字数',
      flags: '检查项',
      noFlags: '没有发现问题。',
      researchEmpty: '还没有检索记录。',
      platform: '平台',
      mapTitle: '地图与路线',
      mapSource: '来源',
      route: '参观路线',
      zones: '空间',
      mapNote: '说明',
      loading: '读取中…',
      refresh: '刷新',
      chars: '总字数',
      minutes: '折合时长',
      minutesUnit: '分钟',
      introLen: '开场字数',
      exhibitsList: '覆盖展品',
      usageHint: '提示：面板只做记录与审核，写作由会话里的 Agent 完成。',
      targetHint: '低于 {n} 字审核不通过',
      videos: '视频',
      videoEmpty: '这一厅还没有讲解视频。让 Agent 搜 B站 / 小红书 / 抖音 / 视频号，再用 museum_guide_video 挂上。',
      videoHint: '点视频在新窗口打开；讲解稿可对照视频学语气和节奏。',
      map3dHint: '按楼层铺开：点展厅跳到对应逐字稿，点视频直接看。',
      mapNoFloors: '还没有分层数据。让 Agent 用 museum_guide_map 的 floors 记录「一层 / 负一层 / 户外」和每层展厅。',
      floorHalls: '厅',
      mapPickFirst: '（这一厅还没写）',
      copiedStart: '启动指令已复制，粘贴到输入框发送即可开始写。',
      videosCount: '共 {n} 条视频',
      tabDetails: '详情',
      mapEdit: '编辑地图',
      mapSave: '保存地图',
      mapCancel: '取消',
      mapEditHint: '每行一个空间：`序号 空间名 = 展厅1 / 展厅2`；先写楼层（一层 / 户外 / 负一层）。',
      mapImageLabel: '官方导览图图片地址（可选）',
      manualAdd: '手动录入地图',
      manualSave: '保存并建档',
      manualHint: '不用等 Agent：自己把楼层和展厅填进来，地图立刻就有了。',
      goChat: '去会话粘贴',
      detailsTitle: '后台数据',
      detailsHint: '字数、展品覆盖、资料与检查项，平时不用看。',
      roomsUnit: '个空间',
      mapLegend: '上 → 下按楼层叠放；数字是官方展陈空间编号，点展厅名跳到讲解。',
      routeTitle: '参观路线',
      floorPlans: '楼层平面图',
      readerEmpty: '这一站还没有写。',
      speak: '朗读',
      pauseSpeak: '暂停',
      resumeSpeak: '继续',
      stopSpeak: '停止',
      speaking: '朗读中 {n}/{total}',
      speechUnsupported: '当前浏览器不支持语音朗读。',
      mapSchematic: '示意图：按官方空间编号与参观顺序绘制，现场细部以馆内标识为准。',
      mapOfficial: '官方导览图',
      uploadMap: '上传官方导览图照片',
      uploading: '上传中…',
      mapNoImage: '还没有导览图照片。拍一张现场折页/手册的平面图，在这里上传。',
      floorOrder: ['上', '中', '下'],
    }

    const EN = {
      title: 'Museum guide writer',
      subtitle: 'Official map first, then a hall-by-hall read-aloud script',
      newProject: 'New script',
      museum: 'Museum',
      museumPlaceholder: 'e.g. Suzhou Archaeology Museum',
      city: 'City',
      cityPlaceholder: 'e.g. Suzhou',
      target: 'Target characters',
      create: 'Create',
      creating: 'Creating…',
      projects: 'Scripts',
      emptyList: 'No scripts yet. Create one, then ask the agent in the chat to start writing.',
      startPrompt: 'Copy start prompt',
      copied: 'Copied — paste it into the composer',
      copyFailed: 'Copy failed; select the prompt manually',
      noSelection: 'Pick a script on the left, or create one',
      emptyTitle: 'Three steps to a script',
      step1: '① Create it here: museum name, 22,000 target and a 20,000 floor by default.',
      step2: '② Copy the start prompt to the agent: it finds the official map first, then checks the web plus Xiaohongshu, Douyin, Kuaishou and Video Account notes.',
      step3: '③ Come back to Audit, Map and Script: characters, the layered floor map, per-hall videos and the ending check live there.',
      mapMissing: 'No map recorded',
      mapReady: 'Map recorded',
      words: 'chars',
      targetWords: 'target',
      halls: 'halls',
      exhibits: 'exhibits',
      sources: 'sources',
      progress: 'Progress',
      shortfall: 'short by',
      reached: 'Floor reached',
      pass: 'Pass',
      fail: 'Fail',
      belowTarget: 'Above floor',
      tabScript: 'Script',
      tabAudit: 'Audit',
      tabSources: 'Sources',
      tabMap: 'Map',
      noSections: 'No sections yet. Ask the agent to write them with museum_guide_section.',
      sectionChars: 'chars',
      expand: 'Expand',
      collapse: 'Collapse',
      copySection: 'Copy',
      copyAll: 'Copy all',
      download: 'Download Markdown',
      delete: 'Delete',
      deleteAsk: 'Delete this script? Exported Markdown files are kept.',
      intro: 'Opening',
      auditVerdictPass: 'Pass: characters, halls, map and ending all check out.',
      auditVerdictFail: 'Not passing yet — fix the items below.',
      auditEmpty: 'Nothing to audit yet.',
      perSection: 'Characters per hall',
      flags: 'Checks',
      noFlags: 'No problems found.',
      researchEmpty: 'No research recorded yet.',
      platform: 'Platform',
      mapTitle: 'Map and route',
      mapSource: 'Source',
      route: 'Route',
      zones: 'Spaces',
      mapNote: 'Note',
      loading: 'Loading…',
      refresh: 'Refresh',
      chars: 'Characters',
      minutes: 'Reading time',
      minutesUnit: 'min',
      introLen: 'Opening',
      exhibitsList: 'Exhibits covered',
      usageHint: 'The panel records and audits; the agent in the chat does the writing.',
      targetHint: 'Below {n} characters fails the audit',
      videos: 'Videos',
      videoEmpty: 'No walkthrough video for this hall yet. Ask the agent to search Bilibili, Xiaohongshu, Douyin and Video Account, then attach them with museum_guide_video.',
      videoHint: 'Links open in a new tab.',
      map3dHint: 'Floors stacked in order. Click a hall to jump to its script; click a video to watch.',
      mapNoFloors: 'No floor data yet. Ask the agent to record floors in museum_guide_map.',
      floorHalls: 'halls',
      mapPickFirst: '(not written yet)',
      copiedStart: 'Start prompt copied — paste it into the composer.',
      videosCount: '{n} videos',
      tabDetails: 'Details',
      mapEdit: 'Edit map',
      mapSave: 'Save map',
      mapCancel: 'Cancel',
      mapEditHint: 'One space per line: `no name = hall 1 / hall 2`; start a line with a floor name.',
      mapImageLabel: 'Official floor-plan image URL (optional)',
      manualAdd: 'Enter map manually',
      manualSave: 'Save and create',
      manualHint: 'Skip the agent: type floors and halls yourself and the map is ready.',
      goChat: 'Go to chat',
      detailsTitle: 'Backend data',
      detailsHint: 'Counts, coverage, sources and checks — hidden by default.',
      roomsUnit: 'spaces',
      mapLegend: 'Stacked top to bottom; numbers are the official space IDs. Click a hall to jump to its script.',
      routeTitle: 'Visit route',
      floorPlans: 'Floor plans',
      readerEmpty: 'Nothing written for this stop yet.',
      speak: 'Read aloud',
      pauseSpeak: 'Pause',
      resumeSpeak: 'Resume',
      stopSpeak: 'Stop',
      speaking: 'Speaking {n}/{total}',
      speechUnsupported: 'This browser has no speech synthesis.',
      mapSchematic: 'Schematic: drawn from official space IDs and visit order; follow on-site signs for detail.',
      mapOfficial: 'Official plan',
      uploadMap: 'Upload an official plan photo',
      uploading: 'Uploading…',
      mapNoImage: 'No plan photo yet. Photograph the brochure floor plan and upload it here.',
      floorOrder: ['Top', 'Mid', 'Bottom'],
    }

    const DICTS = { zh: ZH, en: EN }

    function makeT(ctx) {
      return function t(key, params) {
        let value = DICTS.zh[key] || key
        try {
          const locale = ctx && ctx.get ? ctx.get('locale') : null
          const id = locale && locale.getLocale ? String(locale.getLocale().id || 'zh') : 'zh'
          const dict = DICTS[id] || DICTS[id.split('-')[0]] || DICTS.zh
          value = dict[key] || value
        } catch {
          /* 用中文兜底 */
        }
        if (params) {
          for (const name of Object.keys(params)) {
            value = value.split(`{${name}}`).join(String(params[name]))
          }
        }
        return value
      }
    }

    function useT() {
      const [tick, setTick] = useState(0)
      const translate = useMemo(() => makeT(translateCtx), [])
      useEffect(() => {
        const locale = translateCtx && translateCtx.get ? translateCtx.get('locale') : null
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => setTick(value => value + 1))
      }, [])
      return useMemo(() => translate, [translate, tick])
    }

    const PLATFORM_LABEL = {
      web: '网页',
      official: '官方',
      xiaohongshu: '小红书',
      douyin: '抖音',
      kuaishou: '快手',
      shipinhao: '视频号',
      other: '其他',
    }

    /* ------------------------------------------------------------------ *
     * API
     * ------------------------------------------------------------------ */
    async function api(path, options) {
      const response = await fetch(`/api/museum-guide${path}`, {
        method: (options && options.method) || 'GET',
        headers: options && options.body ? { 'content-type': 'application/json' } : undefined,
        body: options && options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }))
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`)
      return data.value
    }

    function formatNumber(value) {
      const n = Math.round(Number(value) || 0)
      return n.toLocaleString('zh-CN')
    }

    function buildStartPrompt(project, t) {
      const museum = project ? project.museum : '（在这里填博物馆名）'
      const city = project && project.city ? `（${project.city}）` : ''
      const target = project ? project.targetChars : 22000
      const min = project ? project.minChars : 20000
      return [
        `请给「${museum}」${city}写一份讲解逐字稿。`,
        '要求：',
        `1. 先找这座馆的官方导览图/参观手册/展陈平面，记下展厅顺序，再用 museum_guide_map 记录；没有电子版就如实写明。`,
        `2. 检索资料：网页之外查小红书、抖音、快手、视频号的笔记和视频，每条用 museum_guide_research 记下来源与可用的故事点。`,
        `3. 以展厅为模块逐厅写，museum_guide_section kind=hall 一段一厅；核心围绕展品讲故事，全年龄、口语化、可直接照读，不设计互动。`,
        `4. 总字数目标 ${target} 字，不得低于 ${min} 字；开场 5 分钟以内，讲完最后一个展厅就结束，不写总结和致谢。`,
        '5. 每写完一厅跑 museum_guide_audit，不达标就补写还没覆盖的展厅和展品；最后 museum_guide_export 导出终稿。',
        '请现在开始。',
      ].join('\n')
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch {
        /* 落到下面的兜底 */
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(area)
        return ok
      } catch {
        return false
      }
    }

    /* ------------------------------------------------------------------ *
     * 组件
     * ------------------------------------------------------------------ */
    function Badge({ kind, children }) {
      return h('span', { className: `mg-badge mg-badge-${kind}` }, children)
    }

    function ProjectRow({ project, active, onSelect, t }) {
      const total = project.totalChars
      const ratio = project.targetChars > 0 ? Math.min(1, total / project.targetChars) : 0
      const tone = project.pass ? 'ok' : (total >= project.minChars ? 'warn' : 'bad')
      return h('button', {
        type: 'button',
        className: `mg-row${active ? ' is-active' : ''}`,
        onClick: () => onSelect(project.id),
      },
        h('div', { className: 'mg-row-top' },
          h('span', { className: 'mg-row-name' }, project.museum),
          h(Badge, { kind: tone }, project.pass ? t('pass') : (total >= project.minChars ? t('belowTarget') : t('fail'))),
        ),
        h('div', { className: 'mg-row-meta' },
          h('span', null, `${formatNumber(total)} / ${formatNumber(project.targetChars)} ${t('words')}`),
          h('span', null, `${project.halls} ${t('halls')}`),
          project.videos ? h('span', null, `▶ ${project.videos}`) : null,
          project.mapRecorded ? h('span', { className: 'mg-dot', title: t('mapReady') }, '图') : null,
        ),
        h('div', { className: 'mg-mini-bar' },
          h('div', { className: `mg-mini-fill is-${tone}`, style: { width: `${Math.round(ratio * 100)}%` } }),
        ),
      )
    }

    function VideoList({ videos, t }) {
      if (!videos || !videos.length) return h('p', { className: 'mg-video-empty' }, t('videoEmpty'))
      return h('div', { className: 'mg-videos' }, videos.map((video, index) => h('a', {
        key: `${video.url}-${index}`,
        className: 'mg-video',
        href: video.url || undefined,
        target: '_blank',
        rel: 'noreferrer noopener',
        title: video.note || video.title,
      },
        h('span', { className: 'mg-video-plat' }, PLATFORM_LABEL[video.platform] || video.platform || '视频'),
        h('span', { className: 'mg-video-title' }, video.title || video.url || '（未命名）'),
      )))
    }

    function SectionCard({ section, index, t }) {
      const [open, setOpen] = useState(false)
      const [copied, setCopied] = useState(false)
      const text = section.text || ''
      const videos = section.videos || []
      return h('article', {
        className: `mg-section${open ? ' is-open' : ''}`,
        id: `mg-sec-${section.id}`,
        role: 'button',
        tabIndex: 0,
        onClick: () => setOpen(value => !value),
        onKeyDown: event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(value => !value)
          }
        },
      },
        h('header', { className: 'mg-section-head' },
          h('div', { className: 'mg-section-title' },
            h('span', { className: 'mg-section-index' }, String(index).padStart(2, '0')),
            h('span', null, section.kind === 'intro' ? t('intro') : (section.title || '（未命名展厅）')),
            videos.length ? h('span', { className: 'mg-video-badge' }, `${t('videos')} ${videos.length}`) : null,
          ),
          h('div', { className: 'mg-section-tools' },
            h('span', { className: 'mg-chars' }, `${formatNumber(section.chars)} ${t('sectionChars')}`),
            h('button', {
              type: 'button',
              className: 'mg-link',
              onClick: async event => {
                event.stopPropagation()
                const ok = await copyText(text)
                if (ok) {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1400)
                }
              },
            }, copied ? '✓' : t('copySection')),
            h('button', {
              type: 'button',
              className: 'mg-link',
              onClick: event => {
                event.stopPropagation()
                setOpen(value => !value)
              },
            }, open ? t('collapse') : t('expand')),
          ),
        ),
        open
          ? h('pre', { className: 'mg-section-text' }, text)
          : h('p', { className: 'mg-section-preview' }, text.slice(0, 120) + (text.length > 120 ? '…' : '')),
        open ? h('div', { onClick: event => event.stopPropagation() }, h(VideoList, { videos, t })) : null,
      )
    }

    function AuditView({ audit, t }) {
      if (!audit) return h('p', { className: 'mg-muted' }, t('auditEmpty'))
      const reached = audit.totalChars >= audit.minChars
      return h('div', { className: 'mg-audit' },
        h('div', { className: `mg-verdict is-${audit.pass ? 'ok' : 'bad'}` },
          h('strong', null, audit.pass ? t('auditVerdictPass') : t('auditVerdictFail')),
          h('div', { className: 'mg-verdict-nums' },
            h('span', null, `${t('chars')} ${formatNumber(audit.totalChars)}`),
            h('span', null, `${t('targetWords')} ${formatNumber(audit.targetChars)}`),
            h('span', null, `${t('halls')} ${audit.halls}`),
            h('span', null, `${t('exhibits')} ${audit.exhibits}`),
            h('span', null, reached ? t('reached') : `${t('shortfall')} ${formatNumber(audit.shortfall)}`),
            h('span', null, `${audit.minutes} ${t('minutesUnit')}`),
          ),
        ),
        h('h4', { className: 'mg-h4' }, t('perSection')),
        h('div', { className: 'mg-bars' },
          (audit.perSection || []).length
            ? audit.perSection.map(item => h('div', { className: 'mg-bar-row', key: item.id },
              h('span', { className: 'mg-bar-label' }, item.kind === 'intro' ? t('intro') : item.title),
              h('div', { className: 'mg-bar-track' },
                h('div', {
                  className: 'mg-bar-fill',
                  style: { width: `${Math.min(100, (item.chars / Math.max(1, audit.targetChars / Math.max(1, audit.perSection.length))) * 100).toFixed(1)}%` },
                }),
              ),
              h('span', { className: 'mg-bar-num' }, formatNumber(item.chars)),
            ))
            : h('p', { className: 'mg-muted' }, t('noSections')),
        ),
        h('h4', { className: 'mg-h4' }, t('flags')),
        (audit.flags || []).length
          ? h('ul', { className: 'mg-flags' }, audit.flags.map(flag => h('li', { key: flag.code, className: `is-${flag.level}` },
            h('span', { className: 'mg-flag-tag' }, flag.level === 'error' ? '✕' : '!'),
            h('span', null, flag.message),
          )))
          : h('p', { className: 'mg-muted' }, t('noFlags')),
      )
    }

    function SourcesView({ research, t }) {
      if (!research || !research.length) return h('p', { className: 'mg-muted' }, t('researchEmpty'))
      return h('ul', { className: 'mg-sources' }, research.map((item, index) => h('li', { key: `${item.title}-${index}`, className: 'mg-source' },
        h('div', { className: 'mg-source-head' },
          h('span', { className: 'mg-platform' }, PLATFORM_LABEL[item.platform] || item.platform),
          item.url
            ? h('a', { className: 'mg-source-title', href: item.url, target: '_blank', rel: 'noreferrer noopener' }, item.title)
            : h('span', { className: 'mg-source-title' }, item.title),
        ),
        item.takeaway ? h('p', { className: 'mg-source-body' }, item.takeaway) : null,
        (item.exhibits || []).length
          ? h('div', { className: 'mg-tags' }, item.exhibits.map(exhibit => h('span', { className: 'mg-tag', key: exhibit }, exhibit)))
          : null,
      )))
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
      const above = text.match(/(\d)/)
      return above ? Number(above[1]) : index
    }

    function matchSection(sections, name) {
      const halls = (sections || []).filter(section => section.kind === 'hall')
      const key = String(name || '').replace(/\s+/g, '')
      if (!key) return null
      return halls.find(section => {
        const title = String(section.title || '').replace(/\s+/g, '')
        return title.includes(key) || key.includes(title)
      }) || halls.find(section => {
        const title = String(section.title || '').replace(/\s+/g, '')
        return title.slice(0, 4) === key.slice(0, 4)
      }) || null
    }

    function roomOf(room, index) {
      const halls = Array.isArray(room.halls)
        ? room.halls.map(hall => (typeof hall === 'string' ? hall : (hall && (hall.title || hall.name)) || '')).filter(Boolean)
        : []
      return {
        no: String(room.no || index + 1),
        name: String(room.name || `空间 ${index + 1}`),
        halls,
      }
    }

    function floorsOf(map) {
      const explicit = (map && Array.isArray(map.floors) ? map.floors : []).filter(floor => floor && floor.name)
      if (explicit.length) {
        return explicit.map((floor, index) => {
          const rooms = Array.isArray(floor.rooms) && floor.rooms.length
            ? floor.rooms.map(roomOf)
            : [{
              no: '1',
              name: floor.name,
              halls: (Array.isArray(floor.halls) ? floor.halls : [])
                .map(hall => (typeof hall === 'string' ? hall : (hall && (hall.title || hall.name)) || ''))
                .filter(Boolean),
            }]
          return {
            name: String(floor.name),
            level: Number.isFinite(floor.level) ? Number(floor.level) : floorLevelOf(floor.name, index),
            rooms,
          }
        })
      }
      const groups = new Map()
      for (const zone of (map && map.zones) || []) {
        const floor = String(zone.floor || '未标注楼层')
        if (!groups.has(floor)) groups.set(floor, [])
        groups.get(floor).push(zone.name)
      }
      return [...groups.entries()].map(([name, halls], index) => ({
        name,
        level: floorLevelOf(name, index),
        rooms: [{ no: '1', name, halls }],
      }))
    }

    function serializeMap(map) {
      const floors = floorsOf(map)
      const lines = []
      for (const floor of floors) {
        lines.push(floor.name)
        for (const room of floor.rooms) {
          lines.push(`${room.no} ${room.name}${room.halls.length ? ` = ${room.halls.join(' / ')}` : ''}`)
        }
      }
      return lines.join('\n')
    }

    function truncate(text, limit) {
      const value = String(text || '')
      return value.length > limit ? `${value.slice(0, Math.max(1, limit - 1))}…` : value
    }

    function planLayout(floor) {
      const W = 360
      const PAD = 12
      const GAP = 7
      const CORRIDOR = 20
      const rooms = floor.rooms.length ? floor.rooms : [{ no: '1', name: floor.name, halls: [] }]
      const weights = rooms.map(room => Math.max(1, Math.min(8, room.halls.length || 1)))
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      const avail = W - PAD * 2 - GAP * (rooms.length - 1)
      const minRoom = 88
      const maxHalls = Math.max(1, ...rooms.map(room => Math.min(8, room.halls.length || 0)))
      const roomH = 34 + maxHalls * 12
      const corridorY = PAD + roomH + 6
      const H = corridorY + CORRIDOR + PAD
      let widths = rooms.map((room, index) => Math.max(minRoom, avail * (weights[index] / totalWeight)))
      const sum = widths.reduce((a, b) => a + b, 0)
      if (sum > avail) widths = widths.map(width => (width * avail) / sum)
      let x = PAD
      const placed = rooms.map((room, index) => {
        const box = { ...room, x, y: PAD, w: widths[index], h: roomH, lines: room.halls.length ? room.halls : [] }
        x += widths[index] + GAP
        return box
      })
      return { W, H, PAD, corridorY, CORRIDOR, rooms: placed }
    }

    function FloorPlan({ floor, sections, onPick, t }) {
      const layout = planLayout(floor)
      const { W, H, PAD, corridorY, CORRIDOR, rooms } = layout
      const wall = 'var(--dsw-alias-border-l2)'
      const thin = 'var(--dsw-alias-border-l1)'
      return h('svg', {
        className: 'mg-plan-svg',
        viewBox: `0 0 ${W} ${H}`,
        role: 'img',
        'aria-label': floor.name,
      },
        h('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 10, style: { fill: 'var(--dsw-alias-bg-base)', stroke: wall, strokeWidth: 2 } }),
        h('rect', { x: PAD - 4, y: corridorY, width: W - PAD * 2 + 8, height: CORRIDOR, rx: 4, style: { fill: 'var(--dsw-alias-bg-layer-2)' } }),
        h('line', {
          x1: PAD, y1: corridorY + CORRIDOR / 2, x2: W - PAD, y2: corridorY + CORRIDOR / 2,
          style: { stroke: thin, strokeWidth: 1, strokeDasharray: '4 4' },
        }),
        h('text', {
          x: W / 2, y: corridorY + CORRIDOR / 2 + 2.6, textAnchor: 'middle',
          style: { fill: 'var(--dsw-alias-label-secondary)', fontSize: 6.6 },
        }, '走廊'),
        rooms.map((room, roomIndex) => {
          const first = room.lines.length ? matchSection(sections, room.lines[0]) : null
          const roomHalls = room.lines.slice(0, 7)
          const hidden = Math.max(0, room.lines.length - roomHalls.length)
          const maxChars = Math.max(3, Math.floor((room.w - 12) / 6.2))
          return h('g', { key: `${room.no}-${roomIndex}` },
            h('rect', {
              x: room.x, y: room.y, width: room.w, height: room.h, rx: 5,
              style: { fill: 'var(--dsw-alias-bg-layer-1)', stroke: thin, strokeWidth: 1, cursor: first ? 'pointer' : 'default' },
              onClick: () => onPick(first),
            }),
            h('rect', {
              x: room.x + 6, y: room.y + 6, width: 17, height: 17, rx: 4.5,
              style: { fill: 'var(--dsw-alias-brand-primary)' },
            }),
            h('text', {
              x: room.x + 14.5, y: room.y + 18, textAnchor: 'middle',
              style: { fill: 'var(--dsw-alias-bg-base)', fontSize: 9.5, fontWeight: 600 },
            }, room.no),
            h('text', {
              x: room.x + 28, y: room.y + 18,
              style: { fill: 'var(--dsw-alias-label-primary)', fontSize: 8.6, fontWeight: 600 },
            }, truncate(room.name, Math.max(4, Math.floor((room.w - 34) / 8.2)))),
            roomHalls.map((hall, hallIndex) => {
              const section = matchSection(sections, hall)
              const videos = section ? (section.videos || []).length : 0
              const label = `${videos ? '▶ ' : ''}${truncate(hall, maxChars - (videos ? 2 : 0))}`
              return h('text', {
                key: hall,
                x: room.x + 7,
                y: room.y + 33 + hallIndex * 12,
                style: {
                  fill: section ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-idle-primary)',
                  fontSize: 6.8,
                  cursor: section ? 'pointer' : 'default',
                },
                onClick: event => {
                  if (!section) return
                  event.stopPropagation()
                  onPick(section)
                },
              }, label)
            }),
            hidden > 0
              ? h('text', {
                x: room.x + 7, y: room.y + 33 + roomHalls.length * 12,
                style: { fill: 'var(--dsw-alias-state-idle-primary)', fontSize: 6.4 },
              }, `+${hidden}`)
              : null,
            !room.lines.length
              ? h('text', {
                x: room.x + 7, y: room.y + 33,
                style: { fill: 'var(--dsw-alias-state-idle-primary)', fontSize: 6.4 },
              }, t('mapPickFirst'))
              : null,
          )
        }),
        floor.level === 1
          ? h('g', null,
            h('path', {
              d: `M2 ${PAD + 22} L12 ${PAD + 22}`,
              style: { stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 2, strokeLinecap: 'round' },
            }),
            h('path', {
              d: `M8 ${PAD + 19} L12 ${PAD + 22} L8 ${PAD + 25}`,
              style: { fill: 'none', stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' },
            }),
            h('text', {
              x: 2, y: PAD + 14,
              style: { fill: 'var(--dsw-alias-brand-primary)', fontSize: 6 },
            }, '入口'),
          )
          : null,
      )
    }

    function stopsOf(map) {
      const explicit = (map && Array.isArray(map.stops) ? map.stops : []).filter(stop => stop && stop.label)
      if (explicit.length) return explicit
      const route = String((map && map.route) || '')
      if (!route) return []
      return route.split(/→|->/).map(part => part.trim()).filter(Boolean).map((part, index) => {
        const noteMatch = part.match(/（([^）]*)）/)
        return {
          no: String(index + 1).padStart(2, '0'),
          floor: '',
          label: part.replace(/（[^）]*）/g, '').trim(),
          note: noteMatch ? noteMatch[1] : '',
          section: '',
        }
      })
    }

    function hallParts(sections, stop) {
      const halls = (sections || []).filter(section => section.kind === 'hall')
      const norm = value => String(value || '').replace(/\s+/g, '')
      const label = norm(stop && stop.label)
      if (label) {
        const byLabel = halls.filter(section => norm(section.title).includes(label))
        if (byLabel.length) return byLabel
      }
      const wanted = norm(stop && (stop.section || stop.label))
      if (!wanted) return []
      const direct = halls.filter(section => norm(section.title).includes(wanted))
      if (!direct.length) return []
      const base = norm(direct[0].title).split('（')[0].split('：')[0].split(':')[0]
      const siblings = halls.filter(section => norm(section.title).split('（')[0].split('：')[0].split(':')[0] === base)
      return siblings.length > direct.length ? siblings : direct
    }

    function speechChunks(text) {
      const clean = String(text || '').replace(/\s+/g, ' ').trim()
      if (!clean) return []
      const sentences = clean.split(/(?<=[。！？；!?;])/)
      const chunks = []
      let buffer = ''
      for (const sentence of sentences) {
        if ((buffer + sentence).length > 110) {
          if (buffer) chunks.push(buffer)
          buffer = sentence
        } else {
          buffer += sentence
        }
      }
      if (buffer) chunks.push(buffer)
      return chunks.filter(chunk => chunk.trim().length > 1)
    }

    function useSpeech(sections) {
      const [speech, setSpeech] = useState({ no: null, paused: false, spoken: 0, total: 0 })
      const chunksRef = useRef([])
      const indexRef = useRef(0)
      const cancelled = useRef(false)

      const stop = useCallback(() => {
        cancelled.current = true
        chunksRef.current = []
        indexRef.current = 0
        try {
          if (window.speechSynthesis) window.speechSynthesis.cancel()
        } catch {
          /* 没有语音合成 */
        }
        setSpeech({ no: null, paused: false, spoken: 0, total: 0 })
      }, [])

      const play = useCallback(target => {
        const synth = window.speechSynthesis
        if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return
        stop()
        cancelled.current = false
        const parts = hallParts(sections, target)
        const chunks = parts.flatMap(part => speechChunks(part.text))
        if (!chunks.length) return
        chunksRef.current = chunks
        indexRef.current = 0
        setSpeech({ no: target.no, paused: false, spoken: 0, total: chunks.length })
        const next = () => {
          if (cancelled.current) return
          const index = indexRef.current
          if (index >= chunksRef.current.length) {
            setSpeech({ no: null, paused: false, spoken: 0, total: 0 })
            return
          }
          const utterance = new SpeechSynthesisUtterance(chunksRef.current[index])
          utterance.lang = 'zh-CN'
          utterance.rate = 1
          utterance.pitch = 1
          utterance.onend = () => {
            if (cancelled.current) return
            indexRef.current = index + 1
            setSpeech(current => ({ ...current, spoken: index + 1 }))
            next()
          }
          utterance.onerror = () => {
            if (cancelled.current) return
            indexRef.current = index + 1
            next()
          }
          synth.speak(utterance)
        }
        next()
      }, [sections, stop])

      const toggle = useCallback(target => {
        const synth = window.speechSynthesis
        if (speech.no === target.no) {
          if (!synth) return
          if (speech.paused) {
            synth.resume()
            setSpeech(current => ({ ...current, paused: false }))
          } else {
            synth.pause()
            setSpeech(current => ({ ...current, paused: true }))
          }
          return
        }
        play(target)
      }, [play, speech])

      useEffect(() => stop, [stop])

      return { speech, play, toggle, stop }
    }

    function HallReader({ stop, sections, speech, onToggleSpeech, onStopSpeech, t }) {
      const parts = hallParts(sections, stop)
      const chars = parts.reduce((sum, section) => sum + (section.chars || 0), 0)
      const videos = parts.reduce((sum, section) => sum + ((section.videos || []).length), 0)
      const [copied, setCopied] = useState(false)
      const playing = Boolean(speech && speech.no && stop && speech.no === stop.no)
      if (!parts.length) {
        return h('div', { className: 'mg-reader' },
          h('h3', { className: 'mg-reader-title' }, stop ? stop.label : ''),
          h('p', { className: 'mg-muted' }, t('noSections')),
        )
      }
      const all = parts.map(part => `${part.title}\n${part.text || ''}`).join('\n\n')
      return h('div', { className: 'mg-reader' },
        h('header', { className: 'mg-reader-head' },
          h('div', { className: 'mg-reader-headtext' },
            h('h3', { className: 'mg-reader-title' }, stop.label),
            h('p', { className: 'mg-reader-meta' },
              [
                `${formatNumber(chars)} ${t('sectionChars')}`,
                parts.length > 1 ? `${parts.length} 段` : '',
                videos ? `${videos} ${t('videos')}` : '',
                playing && speech.total ? t('speaking', { n: Math.min(speech.spoken + 1, speech.total), total: speech.total }) : '',
              ].filter(Boolean).join(' · ')),
          ),
          h('div', { className: 'mg-reader-actions' },
            h('button', { type: 'button', className: 'mg-btn is-primary', onClick: () => onToggleSpeech(stop) },
              !playing ? `▶ ${t('speak')}` : (speech.paused ? `▶ ${t('resumeSpeak')}` : `⏸ ${t('pauseSpeak')}`)),
            playing
              ? h('button', { type: 'button', className: 'mg-btn is-ghost', onClick: onStopSpeech }, `⏹ ${t('stopSpeak')}`)
              : null,
            h('button', {
              type: 'button',
              className: 'mg-btn is-ghost',
              onClick: async () => {
                const ok = await copyText(all)
                if (ok) {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1400)
                }
              },
            }, copied ? '✓' : t('copySection')),
          ),
        ),
        h('div', { className: 'mg-reader-body' }, parts.map(part => h('article', { key: part.id, className: 'mg-reader-part' },
          h('h4', { className: 'mg-reader-sub' }, part.title),
          h('div', { className: 'mg-reader-text' }, part.text || ''),
          (part.videos || []).length ? h(VideoList, { videos: part.videos, t }) : null,
        ))),
      )
    }

    function RouteMap({ projectId, map, sections, onSaved, t }) {
      const [editing, setEditing] = useState(false)
      const [text, setText] = useState('')
      const [imageUrl, setImageUrl] = useState('')
      const [busy, setBusy] = useState(false)
      const [uploading, setUploading] = useState(false)
      const [error, setError] = useState('')
      const [active, setActive] = useState(0)
      const { speech, toggle, stop: stopSpeech } = useSpeech(sections)

      const stops = stopsOf(map)
      const floors = floorsOf(map)
      const imageSrc = map && map.imageLocal
        ? `/api/museum-guide/map-image?id=${encodeURIComponent(projectId)}&v=${encodeURIComponent(String(map.updatedAt || ''))}`
        : (imageUrl || (map && map.imageUrl) || '')

      useEffect(() => { setActive(0) }, [projectId, map && map.updatedAt])

      useEffect(() => {
        if (active > stops.length - 1) setActive(0)
      }, [stops.length, active])

      const openEditor = () => {
        setText(serializeMap(map))
        setImageUrl((map && map.imageUrl) || '')
        setError('')
        setEditing(true)
      }

      const save = async () => {
        setBusy(true)
        setError('')
        try {
          const value = await api('/map', { method: 'POST', body: { id: projectId, text, imageUrl } })
          onSaved(value)
          setEditing(false)
        } catch (failure) {
          setError(String(failure.message || failure))
        } finally {
          setBusy(false)
        }
      }

      const upload = event => {
        const file = event.target.files && event.target.files[0]
        if (!file) return
        setUploading(true)
        setError('')
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const value = await api('/map-image', { method: 'POST', body: { id: projectId, dataUrl: reader.result } })
            onSaved(value)
            setEditing(false)
          } catch (failure) {
            setError(String(failure.message || failure))
          } finally {
            setUploading(false)
          }
        }
        reader.onerror = () => {
          setError('读取图片失败')
          setUploading(false)
        }
        reader.readAsDataURL(file)
      }

      if (!stops.length) {
        return h('div', { className: 'mg-map-empty' },
          h('p', { className: 'mg-muted' }, t('mapNoFloors')),
          h('button', { type: 'button', className: 'mg-btn is-primary', onClick: openEditor }, t('manualAdd')),
          editing ? h('div', { className: 'mg-map-edit' },
            h('p', { className: 'mg-hint' }, t('mapEditHint')),
            h('textarea', { className: 'mg-textarea', rows: 9, value: text, onChange: event => setText(event.target.value) }),
            h('div', { className: 'mg-edit-actions' },
              h('button', { type: 'button', className: 'mg-btn is-primary', disabled: busy, onClick: save }, busy ? '…' : t('mapSave')),
              h('button', { type: 'button', className: 'mg-btn is-ghost', onClick: () => setEditing(false) }, t('mapCancel')),
            ),
          ) : null,
        )
      }

      const current = stops[Math.min(active, stops.length - 1)]
      const groups = []
      for (const stop of stops) {
        const floor = stop.floor || ''
        if (!groups.length || groups[groups.length - 1].floor !== floor) groups.push({ floor, items: [] })
        groups[groups.length - 1].items.push(stop)
      }

      return h('div', { className: 'mg-route-layout' },
        h('aside', { className: 'mg-route' },
          h('div', { className: 'mg-route-head' },
            h('h4', { className: 'mg-h4' }, t('routeTitle')),
            h('button', { type: 'button', className: 'mg-link', onClick: openEditor }, t('mapEdit')),
          ),
          map && map.route ? h('p', { className: 'mg-route-line' }, map.route) : null,
          h('div', { className: 'mg-route-stops' },
            groups.map(group => h('div', { className: 'mg-route-group', key: group.floor || 'floor' },
              group.floor ? h('div', { className: 'mg-route-floor' }, group.floor) : null,
              group.items.map(stop => {
                const index = stops.indexOf(stop)
                const parts = hallParts(sections, stop)
                const vids = parts.reduce((sum, part) => sum + ((part.videos || []).length), 0)
                const speaking = Boolean(speech.no && speech.no === stop.no)
                return h('div', {
                  key: stop.no,
                  className: `mg-stop${index === active ? ' is-active' : ''}${speaking ? ' is-speaking' : ''}`,
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => {
                    setActive(index)
                    if (speech.no && speech.no !== stop.no) stopSpeech()
                  },
                  onKeyDown: event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActive(index)
                    }
                  },
                },
                  h('button', {
                    type: 'button',
                    className: 'mg-stop-play',
                    title: speaking ? t('pauseSpeak') : t('speak'),
                    'aria-label': speaking ? t('pauseSpeak') : t('speak'),
                    onClick: event => {
                      event.stopPropagation()
                      setActive(index)
                      toggle(stop)
                    },
                  }, speaking && !speech.paused ? '⏸' : '▶'),
                  h('span', { className: 'mg-stop-text' },
                    h('span', { className: 'mg-stop-label' }, stop.label),
                    h('span', { className: 'mg-stop-note' }, `${stop.no}${stop.note ? ` · ${stop.note}` : ''}`),
                  ),
                  vids ? h('span', { className: 'mg-stop-v' }, `▶ ${vids}`) : null,
                )
              }),
            )),
          ),
          h('details', { className: 'mg-route-plans' },
            h('summary', null, t('floorPlans')),
            floors.slice().sort((a, b) => b.level - a.level).map((floor, index) => h('div', { className: 'mg-plan-mini', key: `${floor.name}-${index}` },
              h('div', { className: 'mg-plan-mini-label' }, floor.name),
              h(FloorPlan, { floor, sections, onPick: section => {
                const stop = stops.find(item => hallParts(sections, item).some(part => part.id === (section && section.id)))
                if (stop) setActive(stops.indexOf(stop))
              }, t }),
            )),
          ),
          imageSrc ? h('figure', { className: 'mg-map-figure' },
            h('img', { className: 'mg-map-img', src: imageSrc, alt: t('mapOfficial'), loading: 'lazy' }),
            h('figcaption', { className: 'mg-map-caption' }, t('mapOfficial')),
          ) : null,
        ),

        h('section', { className: 'mg-reader-wrap' },
          editing
            ? h('div', { className: 'mg-map-edit' },
              h('p', { className: 'mg-hint' }, t('mapEditHint')),
              h('textarea', { className: 'mg-textarea', rows: 10, value: text, onChange: event => setText(event.target.value) }),
              h('div', { className: 'mg-upload' },
                h('label', { className: 'mg-field' },
                  h('span', null, t('uploadMap')),
                  h('input', { type: 'file', accept: 'image/*', disabled: uploading, onChange: upload }),
                ),
                uploading ? h('span', { className: 'mg-hint' }, t('uploading')) : null,
              ),
              h('label', { className: 'mg-field' },
                h('span', null, t('mapImageLabel')),
                h('input', { className: 'mg-input', value: imageUrl, placeholder: 'https://…', onChange: event => setImageUrl(event.target.value) }),
              ),
              error ? h('p', { className: 'mg-error-inline' }, error) : null,
              h('div', { className: 'mg-edit-actions' },
                h('button', { type: 'button', className: 'mg-btn is-primary', disabled: busy, onClick: save }, busy ? '…' : t('mapSave')),
                h('button', { type: 'button', className: 'mg-btn is-ghost', onClick: () => setEditing(false) }, t('mapCancel')),
              ),
            )
            : h(HallReader, {
              stop: current,
              sections,
              speech,
              onToggleSpeech: toggle,
              onStopSpeech: stopSpeech,
              t,
            }),
        ),
      )
    }

    function Detail({ project, tab, setTab, onChanged, onReload, t }) {
      const audit = project.audit || { perSection: [], flags: [], totalChars: 0, targetChars: project.targetChars, minChars: project.minChars }
      const total = audit.totalChars || 0
      const ratio = project.targetChars > 0 ? Math.min(1, total / project.targetChars) : 0
      const reached = total >= project.minChars
      const tone = audit.pass ? 'ok' : (reached ? 'warn' : 'bad')
      const [copied, setCopied] = useState('')
      const [detailsOpen, setDetailsOpen] = useState(false)

      const videoTotal = (project.sections || []).reduce((sum, section) => sum + ((section.videos || []).length), 0)
      const floors = (project.map && Array.isArray(project.map.floors)) ? project.map.floors.length : 0

      const fullText = (project.sections || [])
        .map(section => (section.kind === 'intro' ? `【开场】\n${section.text || ''}` : `【${section.title}】\n${section.text || ''}`))
        .join('\n\n')

      const copy = async (text, key) => {
        const ok = await copyText(text)
        setCopied(ok ? key : `${key}:fail`)
        window.setTimeout(() => setCopied(''), 1600)
      }

      const remove = async () => {
        if (!window.confirm(t('deleteAsk'))) return
        await api('/delete', { method: 'POST', body: { id: project.id } })
        onChanged()
      }

      return h('div', { className: 'mg-detail-inner' },
        h('header', { className: 'mg-detail-head' },
          h('div', { className: 'mg-detail-titleline' },
            h('h2', { className: 'mg-detail-title' }, project.museum),
            h(Badge, { kind: tone }, audit.pass ? t('pass') : (reached ? t('belowTarget') : t('fail'))),
          ),
          h('p', { className: 'mg-detail-sub' },
            [
              project.city || '',
              floors ? `${floors} 层` : t('mapMissing'),
              `${audit.halls || 0} ${t('halls')}`,
              videoTotal ? `${videoTotal} ${t('videos')}` : '',
            ].filter(Boolean).join(' · '),
          ),
          h('div', { className: 'mg-detail-actions' },
            h('button', {
              type: 'button',
              className: 'mg-btn is-ghost',
              onClick: () => copy(fullText, 'all'),
            }, copied === 'all' ? '✓' : t('copyAll')),
            h('a', {
              className: 'mg-btn is-ghost',
              href: `/api/museum-guide/export?id=${encodeURIComponent(project.id)}`,
            }, t('download')),
            h('button', {
              type: 'button',
              className: `mg-btn ${detailsOpen ? 'is-primary' : 'is-ghost'}`,
              onClick: () => setDetailsOpen(value => !value),
            }, t('tabDetails')),
            h('button', { type: 'button', className: 'mg-btn is-danger', onClick: remove }, t('delete')),
          ),
        ),

        h('div', { className: 'mg-thin-progress' },
          h('div', { className: `mg-progress-fill is-${tone}`, style: { width: `${Math.round(ratio * 100)}%` } }),
          h('span', { className: 'mg-progress-mark', style: { left: `${Math.round((project.minChars / Math.max(1, project.targetChars)) * 100)}%` } }),
        ),

        detailsOpen
          ? h('div', { className: 'mg-details' },
            h('p', { className: 'mg-hint' }, t('detailsHint')),
            h('div', { className: 'mg-stats' },
              h('div', { className: 'mg-stat' }, h('div', { className: 'mg-stat-num' }, formatNumber(total)), h('div', { className: 'mg-stat-label' }, `${t('chars')} / ${formatNumber(project.targetChars)}`)),
              h('div', { className: 'mg-stat' }, h('div', { className: 'mg-stat-num' }, String(audit.halls || 0)), h('div', { className: 'mg-stat-label' }, t('halls'))),
              h('div', { className: 'mg-stat' }, h('div', { className: 'mg-stat-num' }, String(audit.exhibits || 0)), h('div', { className: 'mg-stat-label' }, t('exhibits'))),
              h('div', { className: 'mg-stat' }, h('div', { className: 'mg-stat-num' }, String((project.research || []).length)), h('div', { className: 'mg-stat-label' }, t('sources'))),
              h('div', { className: 'mg-stat' }, h('div', { className: 'mg-stat-num' }, String(videoTotal)), h('div', { className: 'mg-stat-label' }, t('videos'))),
              h('div', { className: 'mg-stat' }, h('div', { className: 'mg-stat-num' }, `${audit.minutes || 0}`), h('div', { className: 'mg-stat-label' }, t('minutes'))),
            ),
            h('h4', { className: 'mg-h4' }, t('flags')),
            (audit.flags || []).length
              ? h('ul', { className: 'mg-flags' }, audit.flags.map(flag => h('li', { key: flag.code, className: `is-${flag.level}` },
                h('span', { className: 'mg-flag-tag' }, flag.level === 'error' ? '✕' : '!'),
                h('span', null, flag.message),
              )))
              : h('p', { className: 'mg-muted' }, t('noFlags')),
            h('h4', { className: 'mg-h4' }, t('perSection')),
            h('div', { className: 'mg-bars' }, (audit.perSection || []).length
              ? audit.perSection.map(item => h('div', { className: 'mg-bar-row', key: item.id },
                h('span', { className: 'mg-bar-label' }, item.kind === 'intro' ? t('intro') : item.title),
                h('div', { className: 'mg-bar-track' },
                  h('div', { className: 'mg-bar-fill', style: { width: `${Math.min(100, (item.chars / Math.max(1, audit.targetChars / Math.max(1, audit.perSection.length))) * 100).toFixed(1)}%` } }),
                ),
                h('span', { className: 'mg-bar-num' }, formatNumber(item.chars)),
              ))
              : h('p', { className: 'mg-muted' }, t('noSections'))),
            h('h4', { className: 'mg-h4' }, t('tabSources')),
            SourcesView({ research: project.research, t }),
          )
          : null,

        h('nav', { className: 'mg-tabs' },
          ['map', 'script'].map(key => h('button', {
            key,
            type: 'button',
            className: `mg-tab${tab === key ? ' is-active' : ''}`,
            onClick: () => setTab(key),
          }, key === 'map' ? t('tabMap') : t('tabScript'))),
        ),

        h('div', { className: 'mg-tab-body' },
          tab === 'map'
            ? h(RouteMap, {
              projectId: project.id,
              map: project.map,
              sections: project.sections,
              onSaved: onReload,
              t,
            })
            : ((project.sections || []).length
              ? h('div', { className: 'mg-sections' }, project.sections.map((section, index) => h(SectionCard, { key: section.id, section, index: index + 1, t })))
              : h('p', { className: 'mg-muted' }, t('noSections'))),
        ),
      )
    }

    function Workbench() {
      const t = useT()
      const [projects, setProjects] = useState([])
      const [selectedId, setSelectedId] = useState('')
      const [detail, setDetail] = useState(null)
      const [tab, setTab] = useState('map')
      const [error, setError] = useState('')
      const [loaded, setLoaded] = useState(false)
      const [busy, setBusy] = useState(false)
      const [copied, setCopied] = useState(false)
      const [notice, setNotice] = useState('')
      const [manualOpen, setManualOpen] = useState(false)
      const [manualText, setManualText] = useState('')
      const [manualImage, setManualImage] = useState('')
      const [form, setForm] = useState({ museum: '', city: '', targetChars: 22000 })
      const selectedRef = useRef('')
      selectedRef.current = selectedId

      const refreshList = useCallback(async () => {
        const list = await api('/projects')
        setProjects(list)
        if (!selectedRef.current && list.length) {
          setSelectedId(list[0].id)
        }
        return list
      }, [])

      const refreshDetail = useCallback(async id => {
        if (!id) {
          setDetail(null)
          return null
        }
        const project = await api(`/project?id=${encodeURIComponent(id)}`)
        setDetail(project)
        return project
      }, [])

      useEffect(() => {
        let alive = true
        let timer = 0
        const tick = async () => {
          try {
            const list = await api('/projects')
            if (!alive) return
            setProjects(list)
            const id = selectedRef.current || (list[0] && list[0].id) || ''
            if (id) {
              if (!selectedRef.current) setSelectedId(id)
              const project = await api(`/project?id=${encodeURIComponent(id)}`)
              if (alive) setDetail(project)
            } else {
              setDetail(null)
            }
            setError('')
            setLoaded(true)
          } catch (failure) {
            if (alive) setError(String(failure && failure.message ? failure.message : failure))
          }
        }
        tick()
        timer = window.setInterval(tick, 3000)
        return () => {
          alive = false
          window.clearInterval(timer)
        }
      }, [])

      const select = useCallback(id => {
        setSelectedId(id)
        setTab('map')
        refreshDetail(id).catch(failure => setError(String(failure.message || failure)))
      }, [refreshDetail])

      const create = useCallback(async () => {
        const museum = form.museum.trim()
        if (!museum) return
        setBusy(true)
        try {
          const project = await api('/project', { method: 'POST', body: {
            museum,
            city: form.city.trim(),
            targetChars: Number(form.targetChars) || 22000,
          } })
          setForm({ museum: '', city: '', targetChars: 22000 })
          await refreshList()
          setSelectedId(project.id)
          setDetail(project)
          setTab('map')
          setError('')
          const ok = await copyText(buildStartPrompt(project, t))
          setNotice(ok ? t('copiedStart') : t('copyFailed'))
          window.setTimeout(() => setNotice(''), 6000)
        } catch (failure) {
          setError(String(failure.message || failure))
        } finally {
          setBusy(false)
        }
      }, [form, refreshList, t])

      const createWithMap = useCallback(async () => {
        const museum = form.museum.trim()
        if (!museum) return
        if (!manualText.trim()) {
          setError(t('mapEditHint'))
          return
        }
        setBusy(true)
        try {
          const project = await api('/project', { method: 'POST', body: {
            museum,
            city: form.city.trim(),
            targetChars: Number(form.targetChars) || 22000,
          } })
          const value = await api('/map', { method: 'POST', body: { id: project.id, text: manualText, imageUrl: manualImage } })
          setForm({ museum: '', city: '', targetChars: 22000 })
          setManualText('')
          setManualImage('')
          setManualOpen(false)
          await refreshList()
          setSelectedId(value.id)
          setDetail(value)
          setTab('map')
          setError('')
          const ok = await copyText(buildStartPrompt(value, t))
          setNotice(ok ? t('copiedStart') : t('copyFailed'))
          window.setTimeout(() => setNotice(''), 6000)
        } catch (failure) {
          setError(String(failure.message || failure))
        } finally {
          setBusy(false)
        }
      }, [form, manualText, manualImage, refreshList, t])

      const goChat = useCallback(() => {
        const layout = translateCtx && translateCtx.get ? translateCtx.get('layout') : null
        if (layout && typeof layout.selectPanel === 'function') layout.selectPanel('conversation')
      }, [])

      const copyPrompt = useCallback(async () => {
        const project = detail || (projects[0] || null)
        const ok = await copyText(buildStartPrompt(project, t))
        setCopied(ok)
        if (!ok) setError(t('copyFailed'))
        window.setTimeout(() => setCopied(false), 2200)
      }, [detail, projects, t])

      return h('div', { className: 'mg-root' },
        h('style', null, CSS),
        h('header', { className: 'mg-head' },
          h('div', { className: 'mg-head-text' },
            h('h1', { className: 'mg-title' }, t('title')),
            h('p', { className: 'mg-subtitle' }, t('subtitle')),
          ),
          h('div', { className: 'mg-head-actions' },
            h('button', { type: 'button', className: 'mg-btn is-primary', onClick: copyPrompt },
              copied ? t('copied') : t('startPrompt')),
            h('button', {
              type: 'button',
              className: 'mg-btn is-ghost',
              onClick: () => { refreshList().catch(() => {}); refreshDetail(selectedRef.current).catch(() => {}) },
            }, t('refresh')),
          ),
        ),

        error ? h('div', { className: 'mg-error' }, error) : null,
        notice ? h('div', { className: 'mg-notice' },
          h('span', null, notice),
          h('button', { type: 'button', className: 'mg-link', onClick: goChat }, t('goChat')),
        ) : null,

        h('div', { className: 'mg-body' },
          h('aside', { className: 'mg-list' },
            h('div', { className: 'mg-form' },
              h('label', { className: 'mg-field' },
                h('span', null, t('museum')),
                h('input', {
                  className: 'mg-input',
                  value: form.museum,
                  placeholder: t('museumPlaceholder'),
                  onChange: event => setForm({ ...form, museum: event.target.value }),
                  onKeyDown: event => { if (event.key === 'Enter') create() },
                }),
              ),
              h('div', { className: 'mg-field-row' },
                h('label', { className: 'mg-field' },
                  h('span', null, t('city')),
                  h('input', {
                    className: 'mg-input',
                    value: form.city,
                    placeholder: t('cityPlaceholder'),
                    onChange: event => setForm({ ...form, city: event.target.value }),
                  }),
                ),
                h('label', { className: 'mg-field mg-field-narrow' },
                  h('span', null, t('target')),
                  h('input', {
                    className: 'mg-input',
                    type: 'number',
                    min: 1000,
                    step: 1000,
                    value: form.targetChars,
                    onChange: event => setForm({ ...form, targetChars: event.target.value }),
                  }),
                ),
              ),
              h('button', { type: 'button', className: 'mg-btn is-primary is-block', disabled: busy || !form.museum.trim(), onClick: create },
                busy ? t('creating') : t('create')),
              h('button', {
                type: 'button',
                className: 'mg-link mg-manual-trigger',
                onClick: () => setManualOpen(value => !value),
              }, manualOpen ? t('mapCancel') : t('manualAdd')),
              h('p', { className: 'mg-hint' }, t('targetHint', { n: 20000 })),

              manualOpen
                ? h('div', { className: 'mg-manual' },
                  h('p', { className: 'mg-hint' }, t('manualHint')),
                  h('textarea', {
                    className: 'mg-textarea',
                    rows: 7,
                    value: manualText,
                    spellCheck: false,
                    placeholder: '一层\n1 序厅 = 序厅\n2 第一展厅 = 江海共潮生 / 手铲释天书\n负一层\n3 第二展厅 = 文明溯源 / 吴越新证\n户外\n7 户外展区 = 下沉广场',
                    onChange: event => setManualText(event.target.value),
                  }),
                  h('input', {
                    className: 'mg-input',
                    value: manualImage,
                    placeholder: t('mapImageLabel'),
                    onChange: event => setManualImage(event.target.value),
                  }),
                  h('button', {
                    type: 'button',
                    className: 'mg-btn is-primary is-block',
                    disabled: busy || !form.museum.trim() || !manualText.trim(),
                    onClick: createWithMap,
                  }, busy ? t('creating') : t('manualSave')),
                )
                : null,
            ),

            h('h3', { className: 'mg-list-title' }, `${t('projects')}（${projects.length}）`),
            h('div', { className: 'mg-rows' },
              projects.length
                ? projects.map(project => h(ProjectRow, {
                  key: project.id,
                  project,
                  active: project.id === selectedId,
                  onSelect: select,
                  t,
                }))
                : h('p', { className: 'mg-muted' }, loaded ? t('emptyList') : t('loading')),
            ),
            h('p', { className: 'mg-hint mg-hint-foot' }, t('usageHint')),
          ),

          h('section', { className: 'mg-detail' },
            detail
              ? h(Detail, {
                project: detail,
                tab,
                setTab,
                t,
                onReload: value => setDetail(value),
                onChanged: () => { refreshList().catch(() => {}); setDetail(null); setSelectedId('') },
              })
              : h('div', { className: 'mg-empty' },
                h('h2', { className: 'mg-empty-title' }, t('emptyTitle')),
                h('p', { className: 'mg-empty-line' }, t('step1')),
                h('p', { className: 'mg-empty-line' }, t('step2')),
                h('p', { className: 'mg-empty-line' }, t('step3')),
              ),
          ),
        ),
      )
    }

    /* ------------------------------------------------------------------ *
     * 样式
     * ------------------------------------------------------------------ */
    const CSS = `
.mg-root{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;height:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px}
.mg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.mg-title{margin:0;font-size:16px;font-weight:600;letter-spacing:.02em}
.mg-subtitle{margin:3px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary)}
.mg-head-actions{display:flex;gap:8px;flex-wrap:wrap}
.mg-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 12px;font-size:12.5px;line-height:1.4;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:background .12s,border-color .12s}
.mg-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.mg-btn:disabled{opacity:.5;cursor:not-allowed}
.mg-btn.is-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.mg-btn.is-primary:hover{filter:brightness(1.05);background:var(--dsw-alias-brand-primary)}
.mg-btn.is-ghost{background:transparent}
.mg-btn.is-danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-border-l1);background:transparent}
.mg-btn.is-block{width:100%;justify-content:center}
.mg-error{margin:10px 18px 0;padding:8px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);font-size:12px}
.mg-body{display:flex;flex:1 1 auto;min-height:0}
.mg-list{width:262px;flex:0 0 262px;display:flex;flex-direction:column;min-height:0;padding:12px;gap:10px;border-right:1px solid var(--dsw-alias-border-l1);overflow:auto}
.mg-form{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:10px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1)}
.mg-field{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.mg-field-row{display:flex;gap:8px}
.mg-field-narrow{width:96px;flex:0 0 96px}
.mg-input{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:7px;padding:6px 8px;font-size:13px;font-family:inherit}
.mg-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.mg-hint{margin:0;font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.5}
.mg-hint-foot{margin-top:auto;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1)}
.mg-list-title{margin:2px 0 0;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary);letter-spacing:.04em;text-transform:uppercase}
.mg-rows{display:flex;flex-direction:column;gap:6px}
.mg-row{appearance:none;text-align:left;width:100%;border:1px solid transparent;background:transparent;border-radius:9px;padding:8px 9px;cursor:pointer;color:inherit;display:flex;flex-direction:column;gap:5px}
.mg-row:hover{background:var(--dsw-alias-bg-layer-1)}
.mg-row.is-active{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l1)}
.mg-row-top{display:flex;align-items:center;justify-content:space-between;gap:6px}
.mg-row-name{font-size:13px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mg-row-meta{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.mg-dot{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:5px;border:1px solid var(--dsw-alias-border-l1);font-size:9.5px}
.mg-badge{display:inline-flex;align-items:center;padding:1px 7px;border-radius:999px;font-size:10.5px;line-height:1.7;border:1px solid transparent;white-space:nowrap}
.mg-badge-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.mg-badge-warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent)}
.mg-badge-bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.mg-mini-bar{height:3px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.mg-mini-fill{height:100%;border-radius:999px;background:var(--dsw-alias-state-idle-primary)}
.mg-mini-fill.is-ok{background:var(--dsw-alias-state-success-primary)}
.mg-mini-fill.is-warn{background:var(--dsw-alias-state-warn-primary)}
.mg-mini-fill.is-bad{background:var(--dsw-alias-state-error-primary)}
.mg-detail{flex:1 1 auto;min-width:0;overflow:auto}
.mg-detail-inner{display:flex;flex-direction:column;gap:14px;padding:18px 22px 40px;max-width:980px}
.mg-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.mg-detail-title{margin:0;font-size:19px;font-weight:600}
.mg-detail-sub{margin:4px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary);max-width:560px}
.mg-detail-actions{display:flex;gap:6px;flex-wrap:wrap}
.mg-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:8px}
.mg-stat{padding:9px 11px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1)}
.mg-stat-num{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.3}
.mg-stat-label{margin-top:2px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.mg-progress{position:relative;height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.mg-progress-fill{height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary)}
.mg-progress-fill.is-ok{background:var(--dsw-alias-state-success-primary)}
.mg-progress-fill.is-warn{background:var(--dsw-alias-state-warn-primary)}
.mg-progress-fill.is-bad{background:var(--dsw-alias-state-error-primary)}
.mg-progress-mark{position:absolute;top:-2px;width:2px;height:10px;background:var(--dsw-alias-label-secondary);opacity:.6}
.mg-tabs{display:flex;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.mg-tab{appearance:none;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);padding:7px 12px;font-size:12.5px;cursor:pointer;font-family:inherit}
.mg-tab:hover{color:var(--dsw-alias-label-primary)}
.mg-tab.is-active{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}
.mg-tab-body{padding-top:2px}
.mg-sections{display:flex;flex-direction:column;gap:8px}
.mg-section{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:10px 12px}
.mg-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.mg-section-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:550;min-width:0}
.mg-section-index{font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mg-section-tools{display:flex;align-items:center;gap:10px;flex:0 0 auto}
.mg-chars{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mg-link{appearance:none;border:0;background:none;padding:0;color:var(--dsw-alias-brand-primary);font-size:11.5px;cursor:pointer;font-family:inherit}
.mg-section-preview{margin:6px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mg-section-text{margin:8px 0 0;font-size:12.5px;line-height:1.85;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);max-height:420px;overflow:auto;font-family:inherit}
.mg-verdict{display:flex;flex-direction:column;gap:6px;padding:11px 13px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:12.5px}
.mg-verdict.is-ok{border-color:var(--dsw-alias-state-success-primary)}
.mg-verdict.is-bad{border-color:var(--dsw-alias-state-error-primary)}
.mg-verdict-nums{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mg-h4{margin:4px 0 0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);letter-spacing:.03em}
.mg-bars{display:flex;flex-direction:column;gap:5px}
.mg-bar-row{display:flex;align-items:center;gap:10px;font-size:11.5px}
.mg-bar-label{flex:0 0 168px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.mg-bar-track{flex:1 1 auto;height:5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.mg-bar-fill{height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary)}
.mg-bar-num{flex:0 0 56px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.mg-flags{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.mg-flags li{display:flex;gap:8px;align-items:flex-start;padding:7px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);font-size:12px;line-height:1.6}
.mg-flags li.is-error{border-color:var(--dsw-alias-state-error-primary)}
.mg-flags li.is-warn{border-color:var(--dsw-alias-state-warn-primary)}
.mg-flag-tag{flex:0 0 14px;font-weight:700}
.mg-flags li.is-error .mg-flag-tag{color:var(--dsw-alias-state-error-primary)}
.mg-flags li.is-warn .mg-flag-tag{color:var(--dsw-alias-state-warn-primary)}
.mg-sources{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.mg-source{padding:9px 11px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1)}
.mg-source-head{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.mg-platform{flex:0 0 auto;font-size:10px;padding:1px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.mg-source-title{font-size:12.5px;font-weight:550;color:var(--dsw-alias-label-primary);text-decoration:none}
a.mg-source-title:hover{color:var(--dsw-alias-brand-primary)}
.mg-source-body{margin:5px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.mg-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
.mg-tag{font-size:10.5px;padding:1px 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.mg-map{display:flex;flex-direction:column;gap:7px}
.mg-map-title{margin:0;font-size:13px;font-weight:600}
.mg-map-line{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;word-break:break-all}
.mg-map-line a{color:var(--dsw-alias-brand-primary)}
.mg-zones{margin:2px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
.mg-zone-name{font-size:12px}
.mg-zone-floor,.mg-zone-note{margin-left:8px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.mg-empty{max-width:560px;margin:0 auto;padding:44px 24px;display:flex;flex-direction:column;gap:8px}
.mg-empty-title{margin:0 0 4px;font-size:17px;font-weight:600}
.mg-empty-line{margin:0;font-size:12.5px;line-height:1.8;color:var(--dsw-alias-label-secondary)}
.mg-muted{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.7}
.mg-notice{margin:10px 18px 0;padding:8px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary);font-size:12px}
.mg-video-badge{margin-left:4px;font-size:10px;padding:0 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mg-videos{display:flex;flex-direction:column;gap:5px;margin-top:10px}
.mg-video{display:flex;gap:8px;align-items:baseline;text-decoration:none;padding:5px 8px;border-radius:7px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-primary);min-width:0}
.mg-video:hover{border-color:var(--dsw-alias-brand-primary)}
.mg-video-plat{flex:0 0 auto;font-size:10px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:5px;padding:0 5px}
.mg-video-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mg-video-empty{margin:8px 0 0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.mg-section.is-flash{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent)}
.mg-map-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.mg-map-source{font-size:11.5px;color:var(--dsw-alias-brand-primary);text-decoration:none;white-space:nowrap}
.mg-map-hint{margin:2px 0 10px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.mg-stage3d{display:flex;flex-direction:column;gap:24px;padding:8px 6px 20px;perspective:1400px}
.mg-floor3d{display:flex;gap:12px;align-items:stretch}
.mg-floor3d-side{flex:0 0 68px;display:flex;flex-direction:column;justify-content:center;gap:2px}
.mg-floor3d-level{font-size:15px;font-weight:600;line-height:1.3}
.mg-floor3d-count{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.mg-floor3d-stage{flex:1 1 auto;min-width:0}
.mg-floor3d-slab{transform:rotateX(16deg);transform-origin:50% 100%;border-radius:14px;border:1px solid var(--dsw-alias-border-l1);background:linear-gradient(160deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2));box-shadow:0 26px 36px -24px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05);padding:14px 16px 20px;transition:transform .18s ease}
.mg-floor3d:hover .mg-floor3d-slab{transform:rotateX(9deg) translateY(-2px)}
.mg-floor3d-halls{display:flex;flex-wrap:wrap;gap:8px}
.mg-hall3d{appearance:none;cursor:pointer;font-family:inherit;text-align:left;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:9px;padding:7px 10px;font-size:12px;display:inline-flex;align-items:center;gap:7px;box-shadow:0 8px 12px -10px rgba(0,0,0,.6)}
.mg-hall3d:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.mg-hall3d.is-empty{opacity:.5}
.mg-hall3d-videos{font-size:10px;color:var(--dsw-alias-state-success-primary);white-space:nowrap}
.mg-hall3d-none{font-size:9.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mg-detail-titleline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.mg-thin-progress{position:relative;height:5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin:2px 0 10px}
.mg-details{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);margin-bottom:10px}
.mg-notice{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.mg-map-headtext{min-width:0}
.mg-map-headactions{display:flex;align-items:center;gap:10px;flex:0 0 auto}
.mg-map-figure{margin:0;display:flex;flex-direction:column;gap:6px}
.mg-map-img{width:100%;max-height:420px;object-fit:contain;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.mg-map-caption{font-size:11px;color:var(--dsw-alias-label-secondary)}
.mg-plan{display:flex;flex-direction:column;margin-top:6px}
.mg-plate-wrap{display:flex;flex-direction:column}
.mg-plate{display:flex;gap:12px;align-items:stretch}
.mg-plate-tag{flex:0 0 56px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.mg-plate-order{align-self:flex-start;font-size:10px;line-height:1.5;padding:0 5px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.mg-plate-level{font-size:13px;font-weight:600;line-height:1.4}
.mg-plate-body{flex:1 1 auto;min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:linear-gradient(180deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2));padding:8px 10px 10px;box-shadow:0 16px 26px -22px rgba(0,0,0,.62)}
.mg-plan-svg{display:block;width:100%;height:auto}
.mg-plate-head{display:flex;justify-content:flex-end;margin-bottom:6px}
.mg-plate-count{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.mg-rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}
.mg-room{border:1px dashed var(--dsw-alias-border-l1);border-radius:9px;padding:8px 9px 9px;background:var(--dsw-alias-bg-base);min-width:0}
.mg-room-head{display:flex;align-items:center;gap:7px;margin-bottom:6px;min-width:0}
.mg-room-no{flex:0 0 auto;display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;border-radius:5px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-size:10.5px;font-weight:600}
.mg-room-name{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mg-room-halls{display:flex;flex-wrap:wrap;gap:5px}
.mg-hall-chip{appearance:none;font-family:inherit;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:999px;padding:3px 8px;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.mg-hall-chip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.mg-hall-chip.is-empty{opacity:.5;cursor:default}
.mg-hall-v{font-size:9.5px;color:var(--dsw-alias-state-success-primary);white-space:nowrap}
.mg-room-none{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.mg-stairs{display:flex;align-items:center;gap:8px;padding:5px 0 5px 62px;color:var(--dsw-alias-label-secondary)}
.mg-stairs-line{width:1px;height:16px;background:var(--dsw-alias-border-l2)}
.mg-stairs-label{font-size:10.5px}
.mg-map-edit{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);margin:8px 0}
.mg-textarea{width:100%;box-sizing:border-box;resize:vertical;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:12px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;padding:8px}
.mg-edit-actions{display:flex;gap:8px}
.mg-manual{display:flex;flex-direction:column;gap:6px;margin-top:4px;padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l1)}
.mg-manual-trigger{align-self:flex-start;margin-top:-2px}
.mg-upload{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.mg-upload input[type=file]{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.mg-error-inline{margin:0;font-size:11.5px;color:var(--dsw-alias-state-error-primary)}
.mg-route-layout{display:grid;grid-template-columns:292px minmax(0,1fr);gap:14px;align-items:stretch}
.mg-route{display:flex;flex-direction:column;gap:8px;min-width:0;height:calc(100vh - 250px);min-height:460px;max-height:820px;overflow:auto;padding-right:4px}
.mg-route-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.mg-route-line{margin:0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.mg-route-stops{display:flex;flex-direction:column;gap:6px}
.mg-route-group{display:flex;flex-direction:column;gap:5px}
.mg-route-floor{font-size:10.5px;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);margin:7px 0 1px;padding-left:2px}
.mg-stop{appearance:none;font-family:inherit;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;padding:7px 9px;cursor:pointer;color:var(--dsw-alias-label-primary);transition:border-color .12s,background .12s}
.mg-stop:hover{border-color:var(--dsw-alias-brand-primary)}
.mg-stop.is-active{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,var(--dsw-alias-bg-layer-1))}
.mg-stop-play{flex:0 0 auto;width:26px;height:26px;border-radius:50%;border:1px solid var(--dsw-alias-brand-primary);background:transparent;color:var(--dsw-alias-brand-primary);display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;cursor:pointer;font-family:inherit;padding:0}
.mg-stop-play:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.mg-stop.is-speaking .mg-stop-play{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.mg-stop.is-speaking{border-color:var(--dsw-alias-brand-primary)}
.mg-stop-text{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1 1 auto}
.mg-stop-label{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-stop-note{font-size:10.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-stop-v{flex:0 0 auto;font-size:10px;color:var(--dsw-alias-state-success-primary);white-space:nowrap}
.mg-route-plans summary{cursor:pointer;font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:6px;list-style:none}
.mg-route-plans summary::-webkit-details-marker{display:none}
.mg-route-plans summary::before{content:'▸ ';}
.mg-route-plans[open] summary::before{content:'▾ ';}
.mg-plan-mini{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.mg-plan-mini-label{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.mg-reader-wrap{min-width:0;display:flex;height:calc(100vh - 250px);min-height:460px;max-height:820px}
.mg-reader{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:14px 16px 16px}
.mg-reader-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.mg-reader-headtext{min-width:0}
.mg-reader-title{margin:0;font-size:16px;font-weight:600}
.mg-reader-meta{margin:3px 0 0;font-size:11px;color:var(--dsw-alias-label-secondary)}
.mg-reader-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:14px;overflow:auto;padding-right:4px}
.mg-reader-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.mg-speaking{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mg-reader-part{min-width:0}
.mg-reader-sub{margin:0 0 6px;font-size:12px;color:var(--dsw-alias-label-secondary);font-weight:600}
.mg-reader-text{font-size:13.5px;line-height:1.95;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary)}
.mg-section{cursor:pointer}
.mg-section:hover{border-color:var(--dsw-alias-border-l2)}
.mg-section.is-open{border-color:var(--dsw-alias-brand-primary)}
@media (max-width:860px){
.mg-route-layout{grid-template-columns:minmax(0,1fr)}
.mg-route{position:static}
.mg-reader-body{max-height:none}
}
@media (max-width:760px){
.mg-body{flex-direction:column}
.mg-list{width:auto;flex:0 0 auto;max-height:46vh;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.mg-bar-label{flex-basis:104px}
}
`

    /* ------------------------------------------------------------------ *
     * 插件入口
     * ------------------------------------------------------------------ */
    return {
      inject: ['slots'],
      apply(ctx) {
        translateCtx = ctx

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, Workbench))

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 8, label: () => makeT(ctx)('title') },
          PanelIcon,
        ))
      },
    }

    function PanelIcon(props) {
      const size = (props && props.size) || 20
      const active = Boolean(props && props.active)
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', {
          d: 'M4 9.6 12 4l8 5.6',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
          strokeLinecap: 'round', strokeLinejoin: 'round',
        }),
        h('path', { d: 'M5.4 10.6h13.2v1.5H5.4z', fill: 'currentColor', opacity: active ? 0.9 : 0.75 }),
        h('path', {
          d: 'M7.2 12.7v4M10.4 12.7v4M13.6 12.7v4M16.8 12.7v4',
          stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round',
        }),
        h('path', { d: 'M5.4 17.3h13.2v1.6H5.4z', fill: 'currentColor', opacity: active ? 0.9 : 0.75 }),
      )
    }
  },
})