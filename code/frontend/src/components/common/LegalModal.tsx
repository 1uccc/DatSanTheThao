import { useState, useEffect } from 'react';

export type LegalTab = 'terms' | 'privacy';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  onAgree?: () => void;
}

export function LegalModal({ isOpen, initialTab = 'terms', onClose, onAgree }: LegalModalProps) {
  const [tab, setTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700">
              {tab === 'terms' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              )}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase text-slate-900">
                {tab === 'terms' ? 'Điều Khoản Dịch Vụ' : 'Chính Sách Bảo Mật'}
              </h2>
              <p className="text-xs text-slate-500">Nền tảng đặt sân thể thao SportBook</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6 pt-2 gap-4">
          <button
            onClick={() => setTab('terms')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'terms'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📜</span> Điều khoản dịch vụ
          </button>
          <button
            onClick={() => setTab('privacy')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              tab === 'privacy'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🔒</span> Chính sách bảo mật
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-600 leading-relaxed max-h-[60vh]">
          {tab === 'terms' ? (
            <>
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">1. Giới thiệu & Phạm vi áp dụng</h3>
                <p>
                  Chào mừng bạn đến với <strong>SportBook</strong> - Nền tảng kết nối trực tuyến giữa người chơi thể thao và các chủ cơ sở sân bãi (bóng đá, tennis, cầu lông, bóng rổ, pickleball,...). Bằng việc đăng ký tài khoản, đăng nhập hoặc sử dụng dịch vụ trên nền tảng, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản quy định tại đây.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">2. Đăng ký & Bảo mật tài khoản</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Người dùng phải cung cấp thông tin liên hệ chính xác (Họ tên, Số điện thoại, Email) để phục vụ việc xác thực đơn đặt và nhận sân thi đấu.</li>
                  <li>Bạn có trách nhiệm bảo mật thông tin mật khẩu và chịu hoàn toàn trách nhiệm đối với mọi hoạt động diễn ra dưới tài khoản của mình.</li>
                  <li>Nghiêm cấm hành vi mạo danh người khác hoặc sử dụng tài khoản vào các mục đích lừa đảo, phá hoại hệ thống.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">3. Quy định đặt sân & Thanh toán</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Xác nhận lịch:</strong> Đơn đặt sân được xác nhận khi hệ thống ghi nhận giao dịch thanh toán hoặc khi chủ sân phê duyệt lịch đặt.</li>
                  <li><strong>Phương thức thanh toán:</strong> SportBook hỗ trợ chuyển khoản VietQR, cổng thanh toán ZaloPay, MoMo, VNPay hoặc thanh toán tại sân theo quy định của từng chủ sân.</li>
                  <li><strong>Mã đơn hàng:</strong> Mỗi lượt đặt sân thành công có mã đơn duy nhất (ví dụ: #SPB-XXXXXX) dùng để đối chiếu khi đến nhận sân.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">4. Chính sách hủy lịch & Hoàn tiền</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Khách hàng có thể yêu cầu hủy lịch đặt trong mục <em>Lịch sử đặt sân</em> khi đơn đang ở trạng thái chờ duyệt.</li>
                  <li>Đối với đơn đã xác nhận, việc hoàn cọc hoặc dời lịch thi đấu tuân theo chính sách cụ thể của từng chủ sân và cần liên hệ trực tiếp số hotline của cơ sở sân.</li>
                  <li>Trường hợp bất khả kháng do thời tiết xấu (mưa bão ngập sân) hoặc sự cố kỹ thuật từ chủ sân, khách hàng được hoàn tiền 100% hoặc đổi khung giờ khác tương đương.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">5. Quy tắc ứng xử tại sân</h3>
                <p>
                  Khách hàng khi đến sân phải tuân thủ nội quy riêng của cơ sở: mang giày thi đấu đúng chuẩn quy định của mặt sân, giữ gìn vệ sinh chung, không mang chất cấm, vũ khí hoặc chất gây cháy nổ vào khu vực thi đấu.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">6. Quyền thay đổi điều khoản</h3>
                <p>
                  SportBook có quyền cập nhật, điều chỉnh các điều khoản này khi cần thiết. Những thay đổi sẽ có hiệu lực ngay khi được công bố trên ứng dụng và website.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">1. Mục đích thu thập thông tin</h3>
                <p>
                  SportBook cam kết tôn trọng và bảo vệ quyền riêng tư của mọi người dùng. Chúng tôi chỉ thu thập các thông tin cần thiết nhằm mục đích:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Xác thực tài khoản người dùng và duy trì phiên đăng nhập.</li>
                  <li>Xử lý và chuyển thông tin đặt sân đến đúng chủ sân tương ứng.</li>
                  <li>Gửi thông báo cập nhật trạng thái đơn đặt sân, nhắc nhở giờ thi đấu.</li>
                  <li>Hỗ trợ khách hàng và giải quyết khiếu nại (nếu có).</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">2. Phạm vi dữ liệu thu thập</h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Thông tin cá nhân:</strong> Họ tên, Địa chỉ email, Số điện thoại.</li>
                  <li><strong>Thông tin đặt sân:</strong> Lịch sử đặt sân, tên sân, ngày giờ, số tiền thanh toán, ghi chú gửi chủ sân.</li>
                  <li><strong>Thông tin đăng nhập Google:</strong> Khi đăng nhập bằng tài khoản Google, chúng tôi nhận email và họ tên được Google chia sẻ theo sự đồng ý của bạn.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">3. Bảo mật thông tin thanh toán</h3>
                <p>
                  SportBook <strong>hoàn toàn không lưu trữ</strong> thông tin thẻ tín dụng/ghi nợ, mã PIN hoặc mật khẩu ngân hàng của người dùng. Mọi giao dịch qua VietQR, MoMo, ZaloPay, VNPay đều được mã hóa theo tiêu chuẩn bảo mật ngân hàng cao nhất.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">4. Chia sẻ thông tin với chủ sân</h3>
                <p>
                  Khi bạn hoàn tất đặt sân, SportBook chỉ chia sẻ thông tin thiết yếu (Tên khách hàng, Số điện thoại, Mã đơn và Khung giờ đặt) với Chủ sân phụ trách để hỗ trợ việc tiếp đón và bàn giao sân đúng quy trình.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">5. Cam kết bảo mật</h3>
                <p>
                  Chúng tôi áp dụng các tiêu chuẩn mã hóa SSL/TLS và tường lửa đa tầng của Firebase và Google Cloud. Chúng tôi <strong>cam kết không bán, chia sẻ hoặc cho thuê</strong> dữ liệu cá nhân của người dùng cho bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">6. Quyền của người dùng</h3>
                <p>
                  Bạn có quyền xem lại, cập nhật hoặc yêu cầu xóa dữ liệu cá nhân của mình bất kỳ lúc nào tại trang <em>Cài đặt hồ sơ</em> hoặc liên hệ bộ phận hỗ trợ qua email <em>bachtuocndl@gmail.com</em>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Cập nhật lần cuối: Tháng 11/2026 · SportBook Team
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            {onAgree && (
              <button
                onClick={() => {
                  onAgree();
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-green-600 text-xs font-bold text-white hover:bg-green-700 transition-colors shadow-sm"
              >
                Tôi đã đọc & Đồng ý
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
