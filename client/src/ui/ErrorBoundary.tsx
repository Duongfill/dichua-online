import { Component, type ReactNode } from 'react';

/** Cảnh 3D lỗi (vd. thiết bị không hỗ trợ WebGL) → hiện thông báo thay vì màn hình trắng. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center bg-[#e9d9b8] p-6">
        <div className="glass max-w-sm p-6 text-center">
          <p className="font-display text-xl text-brick-700">Có lỗi khi hiển thị ngôi chùa</p>
          <p className="mt-2 text-sm text-amberwood-800">Thiết bị có thể chưa hỗ trợ đồ hoạ 3D (WebGL), hoặc kết nối bị gián đoạn.</p>
          <button className="btn-primary mt-4" onClick={() => location.reload()}>
            Tải lại
          </button>
        </div>
      </div>
    );
  }
}
