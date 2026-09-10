'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flower2, ArrowUpRight } from 'lucide-react';
export default function Login({ setup }: { setup: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = !setup && mode === 'signup';
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
            if (signup && f.get('password') !== f.get('confirmPassword'))
              throw Error('两次输入的密码不一致');
            const r = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: setup ? 'setup' : signup ? 'signup' : 'login',
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
        {!setup && (
          <div className="auth-switch" role="tablist" aria-label="账号入口">
            <button
              type="button"
              role="tab"
              aria-selected={!signup}
              className={!signup ? 'selected' : ''}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={signup}
              className={signup ? 'selected' : ''}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              注册
            </button>
          </div>
        )}
        <div className="auth-heading" key={setup ? 'setup' : mode}>
          <h2>{setup ? '开启你的收藏柜' : signup ? '创建你的收藏柜' : '欢迎回到谷屿'}</h2>
          <p className="muted">
            {setup
              ? '第一次使用，创建本机管理员账号。'
              : signup
                ? '注册个人账号，收藏与账本都独立保存。'
                : '登录后继续整理你的喜欢。'}
          </p>
        </div>
        {(setup || signup) && (
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
            autoComplete={setup || signup ? 'new-password' : 'current-password'}
            required
            placeholder="至少 10 位"
          />
        </label>
        {signup && (
          <label className="auth-confirm">
            确认密码
            <input
              name="confirmPassword"
              type="password"
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              required
              placeholder="再输入一次密码"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? signup
              ? '正在创建…'
              : '正在打开…'
            : setup || signup
              ? '创建收藏柜'
              : '进入收藏柜'}
          <ArrowUpRight size={18} />
        </button>
        <small className="muted">
          {signup ? '已有账号？点击上方“登录”。' : '你的收藏与交易记录，只属于你。'}
        </small>
      </form>
    </main>
  );
}
