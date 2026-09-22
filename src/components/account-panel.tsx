'use client';
import { LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import type { RememberedAccount } from '@/infrastructure/auth';

export default function AccountPanel({
  user,
  accounts,
  onSwitch,
  onAddAccount,
  onLogout,
}: {
  user: { id: string; name: string; email: string; role: string };
  accounts: RememberedAccount[];
  onSwitch: (userId: string) => Promise<void>;
  onAddAccount: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const others = accounts.filter((account) => account.id !== user.id);
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
          <LogOut size={17} /> 退出当前账号
        </button>
      </section>
      <section className="account-switcher">
        <header>
          <UserRound />
          <div>
            <h2>切换账号</h2>
            <p>已在这台设备登录过的账号可以直接切换。</p>
          </div>
        </header>
        <div className="account-switch-list">
          {others.length ? (
            others.map((account) => (
              <button key={account.id} onClick={() => void onSwitch(account.id)}>
                <span className="avatar">{account.name.slice(0, 1)}</span>
                <span>
                  <strong>{account.name}</strong>
                  <small>{account.email}</small>
                </span>
                <LogIn size={17} />
              </button>
            ))
          ) : (
            <p className="muted">暂时没有其他已保存的账号。</p>
          )}
        </div>
        <button className="account-add" onClick={() => void onAddAccount()}>
          <LogIn size={17} /> 使用其他账号或注册新账号
        </button>
        <p className="muted account-session-note">登录状态仅保存在安全 Cookie 中，有效期与当前 Session 一致。</p>
      </section>
    </div>
  );
}
