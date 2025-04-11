import { LEFT } from '../const'
import type { Topic, Wrapper, Parent, Children, Expander } from '../types/dom'
import type { MindElixirInstance, NodeObj } from '../types/index'
import { encodeHTML } from '../utils/index'
import { layoutChildren } from './layout'
import PDFIcon from '../icons/icon-pdf.svg'
import WordIcon from '../icons/icon-word.svg'
import ExcelIcon from '../icons/icon-excel.svg'
import PowerPointIcon from '../icons/icon-powerpoint.svg'
import OtherIcon from '../icons/icon-other.svg'

// 声明全局类型
declare global {
  interface Window {
    handleDocumentNodeClick?: (doc: { name: string; url: string; key?: string; type?: string; fileType?: string }) => void
  }
}

// DOM manipulation
const $d = document
export const findEle = (id: string, instance?: MindElixirInstance) => {
  const scope = instance ? instance.mindElixirBox : $d
  const ele = scope.querySelector<Topic>(`[data-nodeid=me${id}]`)
  if (!ele) throw new Error(`FindEle: Node ${id} not found, maybe it's collapsed.`)
  return ele
}

export const shapeTpc = function (tpc: Topic, nodeObj: NodeObj) {
  tpc.innerHTML = ''

  if (nodeObj.style) {
    tpc.style.color = nodeObj.style.color || ''
    tpc.style.background = nodeObj.style.background || ''
    tpc.style.fontSize = nodeObj.style.fontSize + 'px'
    tpc.style.fontWeight = nodeObj.style.fontWeight || 'normal'
  }

  if (nodeObj.dangerouslySetInnerHTML) {
    tpc.innerHTML = nodeObj.dangerouslySetInnerHTML
    return
  }

  if (nodeObj.image) {
    const img = nodeObj.image
    if (img.url && img.width && img.height) {
      const imgContainer = $d.createElement('div')
      imgContainer.className = 'image-container'

      const imgEl = $d.createElement('img')
      imgEl.src = img.url
      imgEl.style.width = img.width + 'px'
      imgEl.style.height = img.height + 'px'
      if (img.fit) imgEl.style.objectFit = img.fit

      // 添加点击全屏展示功能
      imgEl.addEventListener('click', e => {
        e.stopPropagation()

        // 创建全屏显示容器
        const fullscreenContainer = $d.createElement('div')
        fullscreenContainer.className = 'fullscreen-image-container'
        fullscreenContainer.style.position = 'fixed'
        fullscreenContainer.style.top = '0'
        fullscreenContainer.style.left = '0'
        fullscreenContainer.style.width = '100%'
        fullscreenContainer.style.height = '100%'
        fullscreenContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
        fullscreenContainer.style.zIndex = '9999'
        fullscreenContainer.style.display = 'flex'
        fullscreenContainer.style.justifyContent = 'center'
        fullscreenContainer.style.alignItems = 'center'

        // 创建全屏图片
        const fullscreenImg = $d.createElement('img')
        fullscreenImg.src = img.url
        fullscreenImg.style.maxWidth = '90%'
        fullscreenImg.style.maxHeight = '90%'
        fullscreenImg.style.objectFit = 'contain'

        // 创建关闭按钮
        const closeBtn = $d.createElement('div')
        closeBtn.textContent = '×'
        closeBtn.style.position = 'absolute'
        closeBtn.style.top = '20px'
        closeBtn.style.right = '20px'
        closeBtn.style.color = 'white'
        closeBtn.style.fontSize = '40px'
        closeBtn.style.cursor = 'pointer'
        closeBtn.style.fontWeight = 'bold'

        // 点击关闭全屏
        const closeFullscreen = () => {
          fullscreenContainer.remove()
        }

        closeBtn.addEventListener('click', closeFullscreen)
        fullscreenContainer.addEventListener('click', closeFullscreen)
        fullscreenImg.addEventListener('click', e => {
          e.stopPropagation()
        })

        fullscreenContainer.appendChild(fullscreenImg)
        fullscreenContainer.appendChild(closeBtn)
        document.body.appendChild(fullscreenContainer)
      })

      imgContainer.appendChild(imgEl)
      tpc.appendChild(imgContainer)
      tpc.image = imgEl
    } else {
      console.warn('Image url/width/height are required')
    }
  } else if (tpc.image) {
    tpc.image = undefined
  }

  if (nodeObj.video) {
    const video = nodeObj.video
    if (video.url && video.width && video.height) {
      const videoContainer = $d.createElement('div')
      videoContainer.className = 'video-container'
      videoContainer.style.width = video.width + 'px'
      videoContainer.style.height = video.height + 'px'

      const videoEl = $d.createElement('video')
      videoEl.src = video.url
      videoEl.style.width = '100%'
      videoEl.style.height = '100%'
      videoEl.controls = true
      if (video.autoplay) videoEl.autoplay = true
      if (video.loop) videoEl.loop = true
      if (video.muted) videoEl.muted = true

      videoContainer.appendChild(videoEl)
      tpc.appendChild(videoContainer)
      tpc.video = videoEl
    } else {
      console.warn('Video url/width/height are required')
    }
  } else if (tpc.video) {
    tpc.video = undefined
  }

  if (nodeObj.document) {
    console.log('Document node:', nodeObj.document)
    const doc = nodeObj.document
    // 确保有所需属性
    if (doc.url && doc.name) {
      console.log('Document is valid:', doc)
      const docContainer = $d.createElement('div')
      docContainer.className = 'document-container'

      // 创建图标容器
      const iconContainer = $d.createElement('div')
      iconContainer.className = 'doc-icon'

      // 根据文件名后缀确定文档类型和图标
      const ext = doc.name.split('.').pop()?.toLowerCase()
      let iconSrc = OtherIcon // 默认使用其他类型图标

      switch (ext) {
        case 'pdf':
          iconSrc = PDFIcon
          break
        case 'doc':
        case 'docx':
          iconSrc = WordIcon
          break
        case 'xls':
        case 'xlsx':
          iconSrc = ExcelIcon
          break
        case 'ppt':
        case 'pptx':
          iconSrc = PowerPointIcon
          break
      }

      // 创建图标元素
      const iconImg = $d.createElement('img')
      iconImg.src = iconSrc
      iconImg.className = 'doc-icon-img'
      iconImg.style.width = '24px'
      iconImg.style.height = '24px'
      iconContainer.appendChild(iconImg)

      // 创建文件名容器
      const nameContainer = $d.createElement('div')
      nameContainer.className = 'doc-name'
      nameContainer.textContent = doc.name
      nameContainer.setAttribute('data-full-name', doc.name)
      nameContainer.title = doc.name

      // 添加点击事件，通过全局回调函数处理文档点击
      docContainer.addEventListener('click', e => {
        e.stopPropagation()
        // 检查全局回调函数是否存在
        if (typeof window.handleDocumentNodeClick === 'function') {
          window.handleDocumentNodeClick(doc)
        } else {
          console.error('文档处理函数未找到，请确保 handleDocumentNodeClick 已在全局定义')
        }
      })

      // 组装文档容器
      docContainer.appendChild(iconContainer)
      docContainer.appendChild(nameContainer)
      tpc.appendChild(docContainer)
      tpc.document = docContainer
    } else {
      console.warn('Document url/name are required', doc)
    }
  } else if (tpc.document) {
    tpc.document = undefined
  }

  {
    const textEl = $d.createElement('span')
    textEl.className = 'text'
    textEl.textContent = nodeObj.topic
    tpc.appendChild(textEl)
    tpc.text = textEl
  }

  if (nodeObj.hyperLink) {
    const linkEl = $d.createElement('a')
    linkEl.className = 'hyper-link'
    linkEl.target = '_blank'
    linkEl.innerText = '🔗'
    linkEl.href = nodeObj.hyperLink
    tpc.appendChild(linkEl)
    tpc.link = linkEl
  } else if (tpc.link) {
    tpc.link = undefined
  }

  if (nodeObj.icons && nodeObj.icons.length) {
    const iconsEl = $d.createElement('span')
    iconsEl.className = 'icons'
    iconsEl.innerHTML = nodeObj.icons.map(icon => `<span>${encodeHTML(icon)}</span>`).join('')
    tpc.appendChild(iconsEl)
    tpc.icons = iconsEl
  } else if (tpc.icons) {
    tpc.icons = undefined
  }

  if (nodeObj.tags && nodeObj.tags.length) {
    const tagsEl = $d.createElement('div')
    tagsEl.className = 'tags'
    tagsEl.innerHTML = nodeObj.tags.map(tag => `<span>${encodeHTML(tag)}</span>`).join('')
    tpc.appendChild(tagsEl)
    tpc.tags = tagsEl
  } else if (tpc.tags) {
    tpc.tags = undefined
  }
}

// everything start from `Wrapper`
export const createWrapper = function (this: MindElixirInstance, nodeObj: NodeObj, omitChildren?: boolean) {
  const grp = $d.createElement('me-wrapper') as Wrapper
  const { p, tpc } = this.createParent(nodeObj)
  grp.appendChild(p)
  if (!omitChildren && nodeObj.children && nodeObj.children.length > 0) {
    const expander = createExpander(nodeObj.expanded)
    p.appendChild(expander)
    // tpc.expander = expander
    if (nodeObj.expanded !== false) {
      const children = layoutChildren(this, nodeObj.children)
      grp.appendChild(children)
    }
  }
  return { grp, top: p, tpc }
}

export const createParent = function (this: MindElixirInstance, nodeObj: NodeObj) {
  const p = $d.createElement('me-parent') as Parent
  const tpc = this.createTopic(nodeObj)
  shapeTpc(tpc, nodeObj)
  p.appendChild(tpc)
  return { p, tpc }
}

export const createChildren = function (this: MindElixirInstance, wrappers: Wrapper[]) {
  const children = $d.createElement('me-children') as Children
  children.append(...wrappers)
  return children
}

export const createTopic = function (this: MindElixirInstance, nodeObj: NodeObj) {
  const topic = $d.createElement('me-tpc') as Topic
  topic.nodeObj = nodeObj
  topic.dataset.nodeid = 'me' + nodeObj.id
  topic.draggable = this.draggable
  return topic
}

export function selectText(div: HTMLElement) {
  const range = $d.createRange()
  range.selectNodeContents(div)
  const getSelection = window.getSelection()
  if (getSelection) {
    getSelection.removeAllRanges()
    getSelection.addRange(range)
  }
}

export const editTopic = function (this: MindElixirInstance, el: Topic) {
  console.time('editTopic')
  if (!el) return
  const div = $d.createElement('div')
  const origin = el.text.textContent as string
  el.appendChild(div)
  div.id = 'input-box'
  div.textContent = origin
  div.contentEditable = 'plaintext-only'
  div.spellcheck = false
  const style = getComputedStyle(el)
  div.style.cssText = `min-width:${el.offsetWidth - 8}px;
  color:${style.color};
  padding:${style.padding};
  margin:${style.margin};
  font:${style.font};
  background-color:${style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor};
  border-radius:${style.borderRadius};`
  if (this.direction === LEFT) div.style.right = '0'
  div.focus()

  selectText(div)

  this.bus.fire('operation', {
    name: 'beginEdit',
    obj: el.nodeObj,
  })

  div.addEventListener('keydown', e => {
    e.stopPropagation()
    const key = e.key

    if (key === 'Enter' || key === 'Tab') {
      // keep wrap for shift enter
      if (e.shiftKey) return

      e.preventDefault()
      div.blur()
      this.map.focus()
    }
  })
  div.addEventListener('blur', () => {
    if (!div) return
    const node = el.nodeObj
    const topic = div.textContent?.trim() || ''
    if (topic === '') node.topic = origin
    else node.topic = topic
    div.remove()
    if (topic === origin) return
    el.text.textContent = node.topic
    this.linkDiv()
    this.bus.fire('operation', {
      name: 'finishEdit',
      obj: node,
      origin,
    })
  })
  console.timeEnd('editTopic')
}

export const createExpander = function (expanded: boolean | undefined): Expander {
  const expander = $d.createElement('me-epd') as Expander
  // if expanded is undefined, treat as expanded
  expander.expanded = expanded !== false
  expander.className = expanded !== false ? 'minus' : ''
  return expander
}
