import { toastr } from '@/services/ng';

function addOnlineListener(toast) {
  function onlineStateHandler() {
    toastr.remove(toast.toastId);
    window.removeEventListener('online', onlineStateHandler);
  }
  window.addEventListener('online', onlineStateHandler);
}

export default function init(ngModule) {
  ngModule.run(() => {
    window.addEventListener('offline', () => {
      const toast = toastr.warning('<div>请检查您的互联网连接。</div>', '', {
        allowHtml: true,
        autoDismiss: false,
        timeOut: false,
        tapToDismiss: true,
      });
      addOnlineListener(toast);
    });
  });
}

init.init = true;
