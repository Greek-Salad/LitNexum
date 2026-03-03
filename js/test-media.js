// js/test-media.js

export async function testMediaInjector() {
  console.log("🔍 Testing MediaInjector...");
  
  if (!window.readingApp || !window.readingApp.getMediaInjector) {
    console.error("Reading app not initialized");
    return;
  }
  
  const injector = window.readingApp.getMediaInjector();
  const chapterLoader = window.readingApp.getChapterLoader();
  
  console.log("📋 Media rules:", injector.mediaRules);
  
  injector.mediaRules.forEach(rule => {
    console.log(`Rule ${rule.id}:`, {
      chapter: rule.chapter,
      type: rule.type,
      src: rule.src,
      anchor: rule.anchor?.substring(0, 50) + '...'
    });
    
    if (rule.src && Array.isArray(rule.src)) {
      rule.src.forEach(src => {
        const testUrl = injector.normalizePath(src);
        console.log(`  Testing: ${testUrl}`);
        
        fetch(testUrl, { method: 'HEAD' })
          .then(response => {
            console.log(`    ${testUrl}: ${response.ok ? '✅ OK' : '❌ Not found'}`);
          })
          .catch(error => {
            console.log(`    ${testUrl}: ❌ Error - ${error.message}`);
          });
      });
    }
  });
  
  const currentChapter = chapterLoader.getCurrentChapter();
  console.log(`Current chapter: ${currentChapter}`);
  
  const chapterRules = injector.mediaRules.filter(r => r.chapter === currentChapter);
  console.log(`Media rules for chapter ${currentChapter}:`, chapterRules.length);
  
  const contentElement = document.getElementById('chapter-content');
  if (contentElement) {
    const mediaElements = contentElement.querySelectorAll('.media-container, .audio-player-container');
    console.log(`Media elements in DOM:`, mediaElements.length);
    
    mediaElements.forEach((el, i) => {
      console.log(`  Media ${i + 1}:`, el.tagName, el.className, el.dataset);
    });
  }
}

setTimeout(() => {
  if (window.readingApp) {
    testMediaInjector();
  }
}, 3000);