(function () {
  'use strict'

  var script = document.currentScript
  if (!script || !(script.dataset.widgetId || script.dataset.widgetKey)) return

  var widgetId = script.dataset.widgetId || script.dataset.widgetKey
  var publicUrl = script.dataset.publicUrl || new URL(script.src, window.location.href).origin
  var apiOrigin = script.dataset.apiOrigin || ''
  var iframe = document.createElement('iframe')
  var button = document.createElement('button')
  var panel = document.createElement('div')
  var shadowHost = document.createElement('div')
  var shadow = shadowHost.attachShadow ? shadowHost.attachShadow({ mode: 'open' }) : shadowHost
  var expanded = false

  shadow.innerHTML = '<style>' +
    ':host{all:initial;position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:Inter,ui-sans-serif,system-ui,sans-serif}' +
    '.lumicoria-launcher{width:58px;height:58px;border:0;border-radius:50%;background:#161925;color:#fff;box-shadow:0 14px 34px rgba(22,25,37,.26);cursor:pointer;font-size:25px;display:grid;place-items:center}' +
    '.lumicoria-launcher:focus-visible{outline:3px solid #8177ff;outline-offset:4px}' +
    '.lumicoria-panel{position:absolute;right:0;bottom:74px;width:min(390px,calc(100vw - 32px));height:min(670px,calc(100vh - 110px));background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(22,25,37,.25);overflow:hidden;display:none;border:1px solid rgba(22,25,37,.08)}' +
    '.lumicoria-panel.is-open{display:block}' +
    'iframe{display:block;border:0;width:100%;height:100%;background:#f5f7fc}' +
    '@media(max-width:520px){:host{right:12px;bottom:12px}.lumicoria-panel{right:-4px;bottom:70px;width:calc(100vw - 24px);height:calc(100vh - 96px);border-radius:18px}}' +
    '</style><div class="lumicoria-panel" part="panel"></div><button class="lumicoria-launcher" type="button" aria-label="Open customer support" aria-expanded="false" part="button">?</button>'

  panel = shadow.querySelector('.lumicoria-panel')
  button = shadow.querySelector('.lumicoria-launcher')
  iframe.title = 'Lumicoria customer support'
  iframe.allow = 'microphone; autoplay'
  iframe.loading = 'lazy'
  var query = '?embed=1' + (apiOrigin ? '&api_origin=' + encodeURIComponent(apiOrigin) : '')
  iframe.src = publicUrl.replace(/\/$/, '') + '/chat/' + encodeURIComponent(widgetId) + query
  panel.appendChild(iframe)
  document.body.appendChild(shadowHost)

  function setExpanded(next) {
    expanded = next
    panel.classList.toggle('is-open', expanded)
    button.setAttribute('aria-expanded', String(expanded))
    button.textContent = expanded ? '×' : '?'
  }

  button.addEventListener('click', function () { setExpanded(!expanded) })
  window.addEventListener('message', function (event) {
    if (event.source === iframe.contentWindow && event.data && event.data.type === 'lumicoria-widget-close') setExpanded(false)
  })
}())
