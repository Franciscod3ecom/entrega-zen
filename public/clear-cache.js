// Script de limpeza de cache para forçar atualização
console.log('🧹 Limpando cache do navegador...');

// 1. Limpar Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log(`Desregistrando ${registrations.length} Service Workers...`);
    registrations.forEach(registration => {
      registration.unregister();
      console.log('Service Worker desregistrado:', registration.scope);
    });
  });
}

// 2. Limpar Cache Storage
if ('caches' in window) {
  caches.keys().then(names => {
    console.log(`Deletando ${names.length} caches...`);
    names.forEach(name => {
      caches.delete(name);
      console.log('Cache deletado:', name);
    });
  });
}

// 3. Limpar localStorage e sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('Storage limpo');

// 4. Forçar reload completo (bypass cache)
console.log('✅ Cache limpo! Recarregando página...');
setTimeout(() => {
  window.location.reload(true);
}, 1000);
