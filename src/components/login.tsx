'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flower2, ArrowUpRight } from 'lucide-react';
export default function Login({ setup }: { setup: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <div className="login-art">
        <span className="eyebrow">A LITTLE HOME FOR YOUR COLLECTION</span>
        <h1>
          每一份喜欢，
          <br />
          都有自己的位置。
        </h1>
        <div className="login-flower">
          <Flower2 size={170} strokeWidth={0.8} />
        </div>
        <p>
          记录相遇，收藏心动。
          <br />
          欢迎来到你的谷子小岛。
        </p>
      </div>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const f = new FormData(e.currentTarget);
          try {
            const r = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: setup ? 'setup' : 'login',
                email: f.get('email'),
                password: f.get('password'),
                name: f.get('name') ?? undefined,
              }),
            });
            const j = await r.json();
            if (!r.ok) throw Error(j.error);
            router.replace('/');
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <div className="brand">
          <Flower2 /> 谷屿 <small>GUYU</small>
        </div>
        <h2>{setup ? '开启你的收藏柜' : '欢迎回到谷屿'}</h2>
        <p className="muted">
          {setup ? '第一次使用，创建本机管理员账号。' : '登录后继续整理你的喜欢。'}
        </p>
        {setup && (
          <label>
            收藏家昵称
            <input name="name" required maxLength={50} placeholder="怎么称呼你？" />
          </label>
        )}
        <label>
          邮箱
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          密码
          <input
            name="password"
            type="password"
            minLength={10}
            maxLength={128}
            autoComplete={setup ? 'new-password' : 'current-password'}
            required
            placeholder="至少 10 位"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? '正在打开…' : setup ? '创建收藏柜' : '进入收藏柜'}
          <ArrowUpRight size={18} />
        </button>
        <small className="muted">你的收藏与交易记录，只属于你。</small>
      </form>
    </main>
  );
}
