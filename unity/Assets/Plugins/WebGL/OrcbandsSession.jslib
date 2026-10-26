mergeInto(LibraryManager.library, {
  OrcbandsSessionEvent: function (pointer) {
    if (window.orcbandsSessionEvent) window.orcbandsSessionEvent(UTF8ToString(pointer));
    else window.orcbandsSessionReady = true;
  }
});
