'use client';
import { useState } from 'react';
import { LogOut, ShieldCheck, UserPlus } from 'lucide-react';

export default function AccountPanel({
  user,
  onLogout,
}: {
  user: { name: string; email: string; role: string };
  onLogout: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="account-page">
      <section className="account-card">
        <span className="avatar account-avatar">{user.name.slice(0, 1)}</span>
        <div>
          <span className="eyebrow">CURRENT ACCOUNT</span>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <span className="pill">
            {user.role === 'ADMIN' ? <ShieldCheck size={14} /> : null}
            {user.role === 'ADMIN' ? '图鉴管理员' : '个人收藏账号'}
          </span>
        </div>
        <button className="danger account-logout" onClick={() => void onLogout()}>
          <LogOut size={17} /> 退出 / 切换账号
        </button>
      </section>
      {user.role === 'ADMIN' && (
        <section className="account-create">
          <header>
            <UserPlus />
            <div>
              <h2>创建个人收藏账号</h2>
              <p>管理员继续维护公共图鉴，个人账号单独记录买入、库存、拼团和账本。</p>
            </div>
          </header>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setMessage('');
              setError('');
              const form = event.currentTarget;
              const values = new FormData(form);
              try {
                const response = await fetch('/api/auth', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'register',
                    name: values.get('name'),
                    email: values.get('email'),
                    password: values.get('password'),
                  }),
                });
                const result = await response.json();
                if (!response.ok) throw Error(result.error);
                form.reset();
                setMessage(`已创建「${result.name}」，现在可以切换账号登录。`);
              } catch (exception) {
                setError((exception as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              收藏家昵称
              <input name="name" required maxLength={50} />
            </label>
            <label>
              登录邮箱
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label>
              登录密码
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={busy}>
              <UserPlus size={16} /> {busy ? '正在创建…' : '创建个人账号'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
