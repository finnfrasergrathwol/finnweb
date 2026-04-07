;(function () {
  "use strict"

  const PAGES_WITH_CMS = ["thoughts-ideas", "blogs-papers", "photo-video"]
  let isAdmin = false
  let currentSlug = ""

  function getSlug() {
    return document.body.getAttribute("data-slug") || ""
  }

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/status", { credentials: "include" })
      const data = await res.json()
      return data.authenticated === true
    } catch {
      return false
    }
  }

  async function fetchContent(page) {
    try {
      const res = await fetch("/api/content?page=" + encodeURIComponent(page))
      const data = await res.json()
      return data.sections || []
    } catch {
      return []
    }
  }

  async function fetchMedia(page) {
    try {
      const res = await fetch("/api/media?page_slug=" + encodeURIComponent(page))
      const data = await res.json()
      return data.media || []
    } catch {
      return []
    }
  }

  function renderLatex(el) {
    if (typeof renderMathInElement === "function") {
      renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: false },
        ],
        throwOnError: false,
      })
    }
  }

  function escapeHtml(str) {
    var d = document.createElement("div")
    d.textContent = str
    return d.innerHTML
  }

  function renderBlocks(container, blocks) {
    blocks.forEach(function (b) {
      var p = document.createElement("p")
      p.className = "cms-block"
      p.setAttribute("data-block-id", b.id)
      p.textContent = b.body
      renderLatex(p)
      container.appendChild(p)
    })
  }

  function createHeading(level, text) {
    var h = document.createElement("h" + level)
    h.className = "cms-heading"
    h.textContent = text
    return h
  }

  function renderSection(section, container) {
    var wrapper = document.createElement("div")
    wrapper.className = "cms-section"
    wrapper.setAttribute("data-section-id", section.id)

    var heading = createHeading(section.heading_level, section.title)
    wrapper.appendChild(heading)

    if (isAdmin) {
      var editBtn = document.createElement("button")
      editBtn.className = "cms-edit-btn"
      editBtn.textContent = "Edit"
      editBtn.onclick = function () {
        toggleEditMode(wrapper, section)
      }
      heading.appendChild(editBtn)
    }

    var blocksDiv = document.createElement("div")
    blocksDiv.className = "cms-blocks"
    renderBlocks(blocksDiv, section.blocks || [])
    wrapper.appendChild(blocksDiv)

    container.appendChild(wrapper)
  }

  function toggleEditMode(wrapper, section) {
    var existing = wrapper.querySelector(".cms-edit-panel")
    if (existing) {
      existing.remove()
      return
    }

    var panel = document.createElement("div")
    panel.className = "cms-edit-panel"

    var blocks = section.blocks || []
    blocks.forEach(function (b) {
      var row = document.createElement("div")
      row.className = "cms-edit-row"

      var ta = document.createElement("textarea")
      ta.className = "cms-textarea"
      ta.value = b.body
      ta.setAttribute("data-block-id", b.id)
      ta.rows = 2
      row.appendChild(ta)

      var delBtn = document.createElement("button")
      delBtn.className = "cms-delete-block-btn"
      delBtn.textContent = "x"
      delBtn.onclick = async function () {
        await fetch("/api/content/block?id=" + b.id, {
          method: "DELETE",
          credentials: "include",
        })
        row.remove()
      }
      row.appendChild(delBtn)

      panel.appendChild(row)
    })

    var addBtn = document.createElement("button")
    addBtn.className = "cms-add-block-btn"
    addBtn.textContent = "+ Add block"
    addBtn.onclick = function () {
      var row = document.createElement("div")
      row.className = "cms-edit-row"

      var ta = document.createElement("textarea")
      ta.className = "cms-textarea"
      ta.rows = 2
      ta.setAttribute("data-block-id", "new")
      row.appendChild(ta)

      panel.insertBefore(row, addBtn)
    }
    panel.appendChild(addBtn)

    var saveBtn = document.createElement("button")
    saveBtn.className = "cms-save-btn"
    saveBtn.textContent = "Save"
    saveBtn.onclick = async function () {
      var textareas = panel.querySelectorAll(".cms-textarea")
      for (var i = 0; i < textareas.length; i++) {
        var ta = textareas[i]
        var blockId = ta.getAttribute("data-block-id")
        if (blockId === "new") {
          if (ta.value.trim()) {
            await fetch("/api/content/block", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                section_id: section.id,
                body: ta.value,
                sort_order: i,
              }),
            })
          }
        } else {
          await fetch("/api/content/block?id=" + blockId, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: ta.value }),
          })
        }
      }
      await reloadPage()
    }
    panel.appendChild(saveBtn)

    wrapper.appendChild(panel)
  }

  function renderAddSectionUI(container, pageSlug) {
    if (!isAdmin) return

    var addSection = document.createElement("div")
    addSection.className = "cms-add-section"

    var btn = document.createElement("button")
    btn.className = "cms-add-section-btn"
    btn.textContent = "+ Add new section"
    btn.onclick = function () {
      var form = addSection.querySelector(".cms-new-section-form")
      if (form) {
        form.remove()
        return
      }

      form = document.createElement("div")
      form.className = "cms-new-section-form"

      var levelLabel = document.createElement("label")
      levelLabel.textContent = "Heading level: "
      var levelSelect = document.createElement("select")
      levelSelect.className = "cms-heading-select"
      ;[1, 2, 3].forEach(function (l) {
        var opt = document.createElement("option")
        opt.value = l
        opt.textContent = "H" + l
        if (l === 2) opt.selected = true
        levelSelect.appendChild(opt)
      })
      levelLabel.appendChild(levelSelect)
      form.appendChild(levelLabel)

      var titleInput = document.createElement("input")
      titleInput.type = "text"
      titleInput.placeholder = "Section title"
      titleInput.className = "cms-title-input"
      form.appendChild(titleInput)

      var createBtn = document.createElement("button")
      createBtn.className = "cms-save-btn"
      createBtn.textContent = "Create"
      createBtn.onclick = async function () {
        var title = titleInput.value.trim()
        if (!title) return

        var key = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        var ts = Date.now()
        await fetch("/api/content/section", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_slug: pageSlug,
            section_key: key + "-" + ts,
            title: title,
            heading_level: parseInt(levelSelect.value),
            sort_order: 999,
          }),
        })
        await reloadPage()
      }
      form.appendChild(createBtn)

      addSection.appendChild(form)
    }
    addSection.appendChild(btn)
    container.appendChild(addSection)
  }

  function renderMediaSection(container, mediaItems, pageSlug) {
    mediaItems.forEach(function (m) {
      var wrap = document.createElement("div")
      wrap.className = "cms-media-item"
      wrap.setAttribute("data-media-id", m.id)

      if (m.media_type === "video") {
        var vid = document.createElement("video")
        vid.src = m.url
        vid.controls = true
        vid.className = "cms-media-video"
        wrap.appendChild(vid)
      } else {
        var img = document.createElement("img")
        img.src = m.url
        img.alt = m.alt_text || ""
        img.className = "cms-media-img"
        wrap.appendChild(img)
      }

      if (m.alt_text) {
        var cap = document.createElement("p")
        cap.className = "cms-media-caption"
        cap.textContent = m.alt_text
        wrap.appendChild(cap)
      }

      if (isAdmin) {
        var delBtn = document.createElement("button")
        delBtn.className = "cms-delete-media-btn"
        delBtn.textContent = "Delete"
        delBtn.onclick = async function () {
          if (!confirm("Delete this media?")) return
          await fetch("/api/media?id=" + m.id, {
            method: "DELETE",
            credentials: "include",
          })
          wrap.remove()
        }
        wrap.appendChild(delBtn)
      }

      container.appendChild(wrap)
    })

    if (isAdmin) {
      renderUploadUI(container, pageSlug)
    }
  }

  function renderUploadUI(container, pageSlug) {
    var zone = document.createElement("div")
    zone.className = "cms-upload-zone"

    var label = document.createElement("p")
    label.textContent = "Drag & drop photos/videos here, or click to browse"
    label.className = "cms-upload-label"
    zone.appendChild(label)

    var input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.accept = "image/*,video/*"
    input.className = "cms-upload-input"
    input.onchange = function () {
      uploadFiles(input.files, pageSlug)
    }
    zone.appendChild(input)

    zone.onclick = function () {
      input.click()
    }

    zone.ondragover = function (e) {
      e.preventDefault()
      zone.classList.add("cms-upload-hover")
    }
    zone.ondragleave = function () {
      zone.classList.remove("cms-upload-hover")
    }
    zone.ondrop = function (e) {
      e.preventDefault()
      zone.classList.remove("cms-upload-hover")
      uploadFiles(e.dataTransfer.files, pageSlug)
    }

    container.appendChild(zone)
  }

  async function uploadFiles(files, pageSlug) {
    for (var i = 0; i < files.length; i++) {
      var file = files[i]
      var mediaType = file.type.startsWith("video") ? "video" : "image"
      var url =
        "/api/upload?filename=" +
        encodeURIComponent(file.name) +
        "&page_slug=" +
        encodeURIComponent(pageSlug) +
        "&media_type=" +
        encodeURIComponent(mediaType)

      await fetch(url, {
        method: "POST",
        credentials: "include",
        body: file,
      })
    }
    await reloadPage()
  }

  async function reloadPage() {
    await initCMS()
  }

  async function initCMS() {
    currentSlug = getSlug()
    if (!PAGES_WITH_CMS.includes(currentSlug)) return

    isAdmin = await checkAuth()
    if (isAdmin) {
      document.body.classList.add("admin-authenticated")
    } else {
      document.body.classList.remove("admin-authenticated")
    }

    var slots = document.querySelectorAll(".cms-slot")
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i]
      slot.innerHTML = ""
      var loader = document.createElement("div")
      loader.className = "cms-loader"
      loader.innerHTML = '<div class="cms-spinner"></div>'
      slot.appendChild(loader)
    }

    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i]
      var page = slot.getAttribute("data-page") || currentSlug
      var key = slot.getAttribute("data-section-key")

      var loader = slot.querySelector(".cms-loader")
      if (loader) loader.remove()

      if (key === "media") {
        var mediaItems = await fetchMedia(page)
        renderMediaSection(slot, mediaItems, page)
      } else {
        var sections = await fetchContent(page)

        if (key === "all") {
          sections.forEach(function (s) {
            renderSection(s, slot)
          })
          renderAddSectionUI(slot, page)
        } else {
          var matched = sections.filter(function (s) {
            return s.section_key === key
          })
          matched.forEach(function (s) {
            renderSection(s, slot)
          })
          if (isAdmin && matched.length === 0) {
            var hint = document.createElement("p")
            hint.className = "cms-empty-hint"
            hint.textContent = "No content yet. Add blocks after creating a section."
            slot.appendChild(hint)
          }
        }
      }
    }
  }

  // Handle SPA navigation (Quartz uses micromorph)
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn)
    } else {
      fn()
    }
  }

  onReady(function () {
    initCMS()
    // Re-init after SPA navigations
    document.addEventListener("nav", function () {
      initCMS()
    })
  })
})()
