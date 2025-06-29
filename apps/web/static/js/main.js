function showNotification(icon, title, text, timer = 3000){
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        showClass: {
            popup: `
                animate__animated
                animate__fadeInRight
                animate__faster
            `
        },
        hideClass: {
            popup: `
                animate__animated
                animate__fadeOutRight
                animate__faster
            `
        }
    });

    Toast.fire({
        icon: icon,
        html: `
            <div class="d-flex flex-column gap-1">
                <p class="mb-0 fw-semibold">${title}</p>
                <p class="mb-0">${text}</p>
            </div>
        `
    });
};

function getCookie(cookieName) {
    const name = cookieName + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let cookie of cookieArray) {
        cookie = cookie.trim(); 
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;
};

function setCookie(cookieName, cookieValue) {
  const date = new Date();

  date.setTime(date.getTime() + (100 * 365 * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = cookieName + "=" + encodeURIComponent(cookieValue) + expires + "; path=/";
};