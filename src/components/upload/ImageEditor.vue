<template>
  <div class="editor-wrapper">
    <div class="editor-header">
      <span class="editor-title">✂️ 裁剪图片</span>
      <div class="editor-actions">
        <button class="btn btn-sm btn-outline" @click="$emit('cancel')">取消</button>
        <button class="btn btn-sm btn-primary" @click="confirm">确认</button>
      </div>
    </div>

    <div class="crop-container">
      <img ref="imgRef" :src="imageSrc" alt="裁剪" @load="initCropper" />
    </div>

    <div class="toolbar">
      <button class="tool-btn" @click="rotate(-90)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        <span>左旋</span>
      </button>
      <button class="tool-btn" @click="rotate(90)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        <span>右旋</span>
      </button>
      <button class="tool-btn" @click="flipX">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><polyline points="16 7 12 3 8 7"/><path d="M3 12h18"/></svg>
        <span>翻转</span>
      </button>
      <button class="tool-btn" @click="reset">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        <span>重置</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const props = defineProps({
  imageSrc: { type: String, required: true }
})

const emit = defineEmits(['confirm', 'cancel'])

const imgRef = ref(null)
let cropper = null

function initCropper() {
  if (cropper) {
    cropper.destroy()
  }
  cropper = new Cropper(imgRef.value, {
    viewMode: 1,
    dragMode: 'crop',
    aspectRatio: NaN,  // 自由裁剪
    autoCropArea: 1,
    cropBoxMovable: true,
    cropBoxResizable: true,
    touchDragZoom: true,
    zoomOnTouch: true,
    minCropBoxWidth: 50,
    minCropBoxHeight: 50,
    background: true
  })
}

function rotate(deg) {
  cropper?.rotate(deg)
}

function flipX() {
  cropper?.scaleX(-(cropper.getData().scaleX || 1))
}

function reset() {
  cropper?.reset()
}

function confirm() {
  if (!cropper) {
    emit('confirm', props.imageSrc)
    return
  }
  const canvas = cropper.getCroppedCanvas({
    maxWidth: 1920,
    maxHeight: 1920,
    imageSmoothingQuality: 'high'
  })
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  cropper.destroy()
  cropper = null
  emit('confirm', dataUrl)
}

onBeforeUnmount(() => {
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
})
</script>

<style scoped>
.editor-wrapper {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #000;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1a1a1a;
  z-index: 10;
}

.editor-title {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-actions .btn-outline {
  color: #fff;
  border-color: rgba(255,255,255,0.3);
}
.editor-actions .btn-outline:active {
  background: rgba(255,255,255,0.1);
}

.crop-container {
  flex: 1;
  overflow: hidden;
  background: #000;
}

.crop-container img {
  max-width: 100%;
  display: block;
}

.toolbar {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px calc(12px + var(--safe-bottom));
  background: #1a1a1a;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.8);
  font-size: 11px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.tool-btn:active {
  background: rgba(255,255,255,0.1);
}
</style>
