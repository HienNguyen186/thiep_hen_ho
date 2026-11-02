import { ArrowUpRight, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { invitation } from '../config/invitation';
export function InvitationCover({ onAccept, onLater, paused }: { onAccept: () => void; onLater: () => void; paused: boolean }) {
  return <section className="cover enter">
    <div className="cover-copy">
      <span className="eyebrow"><span className="tiny-line"/> A LITTLE INVITATION, A LOT OF LOVE</span>
      <p className="salutation">Gửi {invitation.recipient}, người anh thương <Heart size={15}/></p>
      <h1>Một buổi hẹn.<br/><em>Chỉ anh & em.</em><span className="heading-star">✳</span></h1>
      <p className="cover-opening">{invitation.opening}</p>
      <p className="cover-description">{invitation.question}<br/>Mình cùng chọn những điều em thích nhé.</p>
      <div className="cover-actions"><button className="button primary" onClick={onAccept}>Em đồng ý <Heart size={17}/><ArrowUpRight size={18}/></button><button className="text-button" onClick={onLater}>Để em suy nghĩ một chút</button></div>
      {paused && <div className="gentle-message" role="status">Không vội đâu em. Em có thể đóng thiệp, hoặc quay lại bất cứ khi nào muốn. 🤍</div>}
      <div className="cover-footnote"><span className="small-heart">♡</span><span>Không cần một dịp đặc biệt.<br/><strong>Vì ở bên em đã là điều đặc biệt.</strong></span></div>
    </div>
    <div className="cover-art" aria-label="Minh họa phong thư hồng với thiệp hẹn hò">
      <div className="art-orbit"/><span className="art-spark spark-one">✧</span><span className="art-spark spark-two">✧</span><span className="art-heart heart-one">♡</span><span className="art-heart heart-two">♡</span>
      <div className="little-label"><span>FOR YOU</span><ArrowUpRight size={16}/></div>
      <div className="letter-paper"><div className="paper-flower">❋</div><span className="paper-overline">YOU, ME & A LITTLE MAGIC</span><p>Let’s go<br/><em>on a date.</em></p><div className="paper-rule"/><span className="paper-signature">with love, {invitation.inviter.toLowerCase()}</span></div>
      <div className="envelope"><div className="envelope-left"/><div className="envelope-right"/><div className="envelope-front"/><div className="wax-seal"><Heart size={24} strokeWidth={1.2}/></div></div>
      <div className="art-caption">a date to remember <span>↗</span></div>
    </div>
    <div className="cover-bottom"><span><Sparkles size={15}/> Một chút mong chờ, một chút rung động.</span><span>DÀNH RIÊNG CHO {invitation.recipient.toUpperCase()} <ArrowRight size={14}/></span></div>
  </section>;
}
