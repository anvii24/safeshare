import type { DetectionType } from '../lib/detectors'
import type { ReviewItem } from '../lib/review'

// One colour per kind of item, shared by the boxes on the image and the list.
const TYPE_COLORS: Record<DetectionType, string> = {
  aadhaar: '#e11d48',
  aadhaar_vid: '#c026d3',
  pan: '#ea580c',
  bank_account: '#b45309',
  ifsc: '#4d7c0f',
  phone: '#0284c7',
  email: '#2563eb',
  dob: '#059669',
  qr_code: '#334155',
}
const CUSTOM_COLOR = '#7c3aed'

export const itemColor = (item: ReviewItem) => (item.type ? TYPE_COLORS[item.type] : CUSTOM_COLOR)
export const DRAW_COLOR = CUSTOM_COLOR
