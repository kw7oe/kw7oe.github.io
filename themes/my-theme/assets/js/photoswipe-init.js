const GALLERY_SELECTOR = '.prose';
const ITEM_SELECTOR = 'a[data-pswp-width][data-pswp-height]';
const LIGHTBOX_MODULE_URL = '/lib/photoswipe/photoswipe-lightbox.esm.js';
const CORE_MODULE_URL = '/lib/photoswipe/photoswipe.esm.js';
const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 1200;

function shouldSkipImage(img) {
    return img.classList.contains('no-lightbox')
        || img.classList.contains('icon')
        || /avatar|icon|logo|thumb|thumbnail/.test(img.className);
}

function parsePositiveInteger(value) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function applyDimensionsFromImage(anchor, img) {
    const width = parsePositiveInteger(img.getAttribute('width'))
        || parsePositiveInteger(img.dataset.width)
        || parsePositiveInteger(img.naturalWidth)
        || DEFAULT_WIDTH;
    const height = parsePositiveInteger(img.getAttribute('height'))
        || parsePositiveInteger(img.dataset.height)
        || parsePositiveInteger(img.naturalHeight)
        || DEFAULT_HEIGHT;

    anchor.dataset.pswpWidth = String(width);
    anchor.dataset.pswpHeight = String(height);

    if (img.alt) {
        anchor.dataset.pswpCaption = img.alt;
    }
}

function ensureLightboxAnchors(root = document) {
    const images = root.querySelectorAll('.prose img:not([data-no-lightbox])');

    images.forEach((img) => {
        if (shouldSkipImage(img) || img.closest(ITEM_SELECTOR)) {
            return;
        }

        if (img.closest('a')) {
            return;
        }

        const anchor = document.createElement('a');
        anchor.href = img.currentSrc || img.src;
        anchor.dataset.pswpGallery = 'default';
        applyDimensionsFromImage(anchor, img);

        const parent = img.parentNode;
        parent.insertBefore(anchor, img);
        anchor.appendChild(img);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    ensureLightboxAnchors(document);

    import(LIGHTBOX_MODULE_URL).then(({ default: PhotoSwipeLightbox }) => {
        const lightbox = new PhotoSwipeLightbox({
            gallery: GALLERY_SELECTOR,
            children: ITEM_SELECTOR,
            pswpModule: () => import(CORE_MODULE_URL),
            bgOpacity: 0.9,
            showHideAnimationType: 'zoom'
        });

        lightbox.init();
    }).catch((error) => {
        console.error('Failed to initialize PhotoSwipe lightbox', error);
    });
});
