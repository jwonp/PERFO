import '@testing-library/jest-dom'

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// vaul uses setPointerCapture / releasePointerCapture for drag — jsdom doesn't have them
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? function () {}
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? function () {}
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? function () { return false }

// Radix Presence checks getComputedStyle(node).animationName to decide whether to wait
// for animationend. Return 'none' so it unmounts immediately without animation.
// Also return 'none' for transform so vaul's getTranslate doesn't throw.
const _getComputedStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = (element: Element, pseudoElement?: string | null) => {
  const style = _getComputedStyle(element, pseudoElement)
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'animationName') return 'none'
      if (prop === 'animationDuration') return '0s'
      if (prop === 'transform') return 'none'
      const value = Reflect.get(target, prop)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
