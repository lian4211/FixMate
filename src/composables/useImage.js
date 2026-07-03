/**
 * 图片压缩工具
 * 将图片压缩到指定尺寸和质量，减少 API 消耗
 */
export function useImage() {
  /**
   * 压缩图片
   * @param {File} file - 原始图片文件
   * @param {Object} options
   * @param {number} options.maxWidth - 最大宽度 (默认 1920)
   * @param {number} options.maxHeight - 最大高度 (默认 1920)
   * @param {number} options.quality - JPEG 质量 0-1 (默认 0.8)
   * @param {number} options.maxSize - 最大文件大小 byte (默认 1MB)
   * @returns {Promise<{dataUrl: string, blob: Blob, file: File}>}
   */
  function compress(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.8,
      maxSize = 1 * 1024 * 1024
    } = options

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // 计算缩放尺寸
          let { width, height } = img
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width))
            width = maxWidth
          }
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height))
            height = maxHeight
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          // 尝试压缩到目标大小
          let q = quality
          const tryCompress = () => {
            const dataUrl = canvas.toDataURL('image/jpeg', q)
            const blob = dataURLToBlob(dataUrl)

            if (blob.size > maxSize && q > 0.1) {
              q -= 0.1
              tryCompress()
              return
            }

            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg'
            })

            resolve({ dataUrl, blob, file: compressedFile })
          }

          tryCompress()
        }
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('图片读取失败'))
      reader.readAsDataURL(file)
    })
  }

  function dataURLToBlob(dataUrl) {
    const parts = dataUrl.split(',')
    const mime = parts[0].match(/:(.*?);/)[1]
    const bytes = atob(parts[1])
    const ab = new ArrayBuffer(bytes.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < bytes.length; i++) {
      ia[i] = bytes.charCodeAt(i)
    }
    return new Blob([ab], { type: mime })
  }

  return { compress }
}
