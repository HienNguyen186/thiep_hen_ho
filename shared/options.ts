export type Option = { id: string; label: string; description?: string; emoji: string; photo?: string };
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=240&q=75`;
export const dresscodes: Option[] = [
  { id: 'casual', label: 'Casual', description: 'Thoải mái, năng động', emoji: '👟' },
  { id: 'smart-casual', label: 'Smart casual', description: 'Thanh lịch, trẻ trung', emoji: '👔' },
  { id: 'elegant', label: 'Elegant', description: 'Một chút sang trọng', emoji: '👗' },
  { id: 'all-black', label: 'All black', description: 'Cùng diện tông đen', emoji: '🖤' },
  { id: 'korean', label: 'Korean style', description: 'Nhẹ nhàng kiểu Hàn', emoji: '🧥' },
  { id: 'couple', label: 'Couple outfit', description: 'Hôm nay mình mặc đồ đôi', emoji: '🤍' },
  { id: 'surprise', label: 'Anh chọn nhé', description: 'Một chút bất ngờ', emoji: '🎁' },
  { id: 'other', label: 'Phong cách khác', description: 'Em sẽ nhắn ở bên dưới', emoji: '🎀' },
];
export const foods: Option[] = [
  { id: 'vietnamese', label: 'Món Việt', emoji: '🍜', photo: image('photo-1555939594-58d7cb561ad1') },
  { id: 'korean', label: 'Món Hàn', emoji: '🍱', photo: image('photo-1498654896293-37aacf113fd9') },
  { id: 'japanese', label: 'Món Nhật', emoji: '🍣', photo: image('photo-1579871494447-9811cf80d66c') },
  { id: 'chinese', label: 'Món Hoa', emoji: '🥟', photo: image('photo-1563245372-f21724e3856d') },
  { id: 'thai', label: 'Món Thái', emoji: '🍤', photo: image('photo-1559314809-0d155014e29e') },
  { id: 'italian', label: 'Món Ý', emoji: '🍝', photo: image('photo-1551183053-bf91a1d81141') },
  { id: 'bbq', label: 'Đồ nướng', emoji: '🥩', photo: image('photo-1544025162-d76694265947') },
  { id: 'hotpot', label: 'Lẩu', emoji: '🍲', photo: image('photo-1767298021358-ba76c73a5c5f') },
  { id: 'seafood', label: 'Hải sản', emoji: '🦐', photo: image('photo-1559737558-2f5a35f4523b') },
  { id: 'steak', label: 'Steak', emoji: '🥩', photo: image('photo-1572014228772-d67640f1e39f') },
  { id: 'fast-food', label: 'Ăn nhanh', emoji: '🍔', photo: image('photo-1568901346375-23c9450c58cd') },
  { id: 'vegetarian', label: 'Món chay', emoji: '🥗', photo: image('photo-1512621776951-a57141f2eefd') },
  { id: 'no-preference', label: 'Anh chọn giúp em', emoji: '💌' },
];
export const desserts: Option[] = [
  { id: 'ice-cream', label: 'Kem', emoji: '🍨', photo: image('photo-1563805042-7684c019e1cb') },
  { id: 'cake', label: 'Bánh ngọt', emoji: '🍰', photo: image('photo-1578985545062-69928b1d9587') },
  { id: 'bakery', label: 'Bánh nướng', emoji: '🥐', photo: image('photo-1555507036-ab1f4038808a') },
  { id: 'waffle', label: 'Waffle', emoji: '🧇', photo: image('photo-1562376552-0d160a2f238d') },
  { id: 'sweet-soup', label: 'Chè', emoji: '🥣' },
  { id: 'fruit', label: 'Trái cây', emoji: '🍓', photo: image('photo-1490474418585-ba9bad8fd0ea') },
  { id: 'none', label: 'Không ăn tráng miệng', emoji: '🤍' },
];
export const drinks: Option[] = [
  { id: 'coffee', label: 'Cà phê', emoji: '☕', photo: image('photo-1509042239860-f550ce710b93') },
  { id: 'milk-tea', label: 'Trà sữa', emoji: '🧋', photo: image('photo-1558857563-b371033873b8') },
  { id: 'fruit-tea', label: 'Trà trái cây', emoji: '🍑' },
  { id: 'juice', label: 'Nước ép', emoji: '🍊', photo: image('photo-1600271886742-f049cd451bba') },
  { id: 'matcha', label: 'Matcha', emoji: '🍵', photo: image('photo-1515823064-d6e0c04616a7') },
  { id: 'smoothie', label: 'Sinh tố', emoji: '🥭', photo: image('photo-1505252585461-04db1eb84625') },
  { id: 'no-preference', label: 'Gì cũng được', emoji: '🤍' },
];
export const activities: Option[] = [
  { id: 'movie', label: 'Đi xem phim', emoji: '🎬', description: 'Một bộ phim, hai đứa mình' },
  { id: 'walk', label: 'Đi dạo', emoji: '🌷', description: 'Nắm tay qua những con phố' },
  { id: 'cafe', label: 'Đi cà phê', emoji: '☕', description: 'Ngồi kể nhau nghe mọi điều' },
  { id: 'mall', label: 'Đi mua sắm', emoji: '🛍️', description: 'Dạo trung tâm thương mại' },
  { id: 'photobooth', label: 'Chụp photobooth', emoji: '📸', description: 'Giữ lại một chút đáng yêu' },
  { id: 'games', label: 'Chơi game', emoji: '🎮', description: 'Cùng về một đội' },
  { id: 'sightseeing', label: 'Ngắm cảnh', emoji: '🌅', description: 'Đợi hoàng hôn cùng nhau' },
  { id: 'surprise', label: 'Một nơi bất ngờ', emoji: '🗺️', description: 'Để anh giữ một bí mật nhỏ' },
  { id: 'together', label: 'Chỉ cần bên nhau', emoji: '🫶', description: 'Ở đâu cũng là buổi hẹn' },
  { id: 'you-plan', label: 'Anh lên kế hoạch nhé', emoji: '💌', description: 'Em tin vào gu của anh' },
];
export const returnTimes = [
  { id: 'before-20', label: 'Trước 20:00' }, { id: '20-21', label: '20:00 – 21:00' },
  { id: '21-22', label: '21:00 – 22:00' }, { id: '22-23', label: '22:00 – 23:00' },
  { id: 'after-23', label: 'Sau 23:00' }, { id: 'flexible', label: 'Không giới hạn thời gian' },
  { id: 'specific', label: 'Em muốn chọn giờ cụ thể' },
];
export function labels(ids: string[], options: { id: string; label: string }[]) { return ids.map(id => options.find(o => o.id === id)?.label ?? id).join(', '); }
