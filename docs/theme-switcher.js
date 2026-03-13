(() => {
  const STORAGE_KEY = "finn-color-mode"
  const MODES = new Set(["light", "blue", "golden"])
  let storageOk = true
  let runtimeMode = "golden"

  function setSavedMode(mode) {
    if (!storageOk) return
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      storageOk = false
    }
  }

  function getSavedMode() {
    if (!storageOk) return null
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      storageOk = false
      return null
    }
  }

  function applyMode(mode) {
    const selected = MODES.has(mode) ? mode : "light"
    runtimeMode = selected
    document.body.setAttribute("data-finn-mode", selected)
    setSavedMode(selected)

    document.querySelectorAll("[data-theme-mode]").forEach((button) => {
      const isActive = button.getAttribute("data-theme-mode") === selected
      button.setAttribute("aria-pressed", String(isActive))
    })
  }

  function currentMode() {
    const saved = getSavedMode()
    if (MODES.has(saved)) return saved
    const bodyMode = document.body?.getAttribute("data-finn-mode")
    if (MODES.has(bodyMode)) return bodyMode
    return MODES.has(runtimeMode) ? runtimeMode : "golden"
  }

  function init() {
    applyMode(currentMode())
  }

  document.addEventListener("click", (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const button = target.closest("[data-theme-mode]")
    if (!button) return

    const mode = button.getAttribute("data-theme-mode")
    if (!mode) return

    applyMode(mode)
  })

  document.addEventListener("nav", init)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
