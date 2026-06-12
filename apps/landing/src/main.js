const previewItems = document.querySelectorAll("[data-preview-index]");

const selectPreviewPair = (index) => {
  previewItems.forEach((item) => {
    const isActive = item.dataset.previewIndex === index;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
};

previewItems.forEach((item) => {
  item.addEventListener("click", () => {
    selectPreviewPair(item.dataset.previewIndex);
  });
});
