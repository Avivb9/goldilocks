import clsx from 'clsx';
import { Bell, CreditCard, Download, Mail, MoreHorizontal, SlidersHorizontal, Trash2, User, Users } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmModal, FieldError, Input, Label, Menu, Modal, PageHeader, Progress, Select, Switch } from '../components/ui';
import { INVOICES } from '../data/seed';
import { money, num, relativeTime, shortDate } from '../logic/format';
import type { BillingPeriod, Currency } from '../logic/types';
import { useStore, type Settings } from '../store/useStore';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Users },
  { id: 'defaults', label: 'Defaults', icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function SettingsPage() {
  const { tab = 'profile' } = useParams();
  const navigate = useNavigate();
  const valid = TABS.some((t) => t.id === tab);
  return (
    <div>
      <PageHeader title="Settings" description="Your profile, the Tidepool workspace and how Goldilocks behaves." />
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map((t) => (
            <NavLink
              key={t.id}
              to={`/settings/${t.id}`}
              className={({ isActive }) =>
                clsx(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium',
                  isActive ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:bg-sunken hover:text-ink',
                )
              }
            >
              <t.icon size={15} /> {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 max-w-3xl">
          {!valid && (
            <Card>
              <p className="text-[13px] text-muted">That settings page doesn't exist.</p>
              <Button className="mt-3" onClick={() => navigate('/settings/profile')}>
                Go to Profile
              </Button>
            </Card>
          )}
          {tab === 'profile' && <ProfileTab />}
          {tab === 'workspace' && <WorkspaceTab />}
          {tab === 'defaults' && <DefaultsTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'billing' && <BillingTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const profile = useStore((s) => s.settings.profile);
  const update = useStore((s) => s.updateSettings);
  const toast = useStore((s) => s.toast);
  const [form, setForm] = useState(profile);
  const [touched, setTouched] = useState(false);
  const errors = {
    name: form.name.trim().length < 2 ? 'Enter your full name.' : undefined,
    email: !EMAIL.test(form.email) ? 'Enter a valid email address.' : undefined,
    title: !form.title.trim() ? 'Add a role so teammates know who owns what.' : undefined,
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(profile);
  const save = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    update('profile', form);
    toast('Profile saved');
  };
  return (
    <Card className="p-6">
      <CardHeader title="Profile" subtitle="How you appear on studies, scenarios and memos." />
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={form.name || 'A'} size={56} />
        <Button size="sm" onClick={() => toast('Avatars sync from your Tidepool SSO profile', 'info')}>
          Change photo
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pname">Full name</Label>
          <Input id="pname" value={form.name} invalid={touched && !!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldError>{touched ? errors.name : undefined}</FieldError>
        </div>
        <div>
          <Label htmlFor="ptitle">Role</Label>
          <Input id="ptitle" value={form.title} invalid={touched && !!errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <FieldError>{touched ? errors.title : undefined}</FieldError>
        </div>
        <div>
          <Label htmlFor="pemail">Work email</Label>
          <Input id="pemail" type="email" value={form.email} invalid={touched && !!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <FieldError>{touched ? errors.email : undefined}</FieldError>
        </div>
        <div>
          <Label htmlFor="ptz">Time zone</Label>
          <Select id="ptz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
            {['Asia/Jerusalem', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore'].map((z) => (
              <option key={z}>{z}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" disabled={!dirty} onClick={() => setForm(profile)}>
          Discard
        </Button>
        <Button variant="primary" disabled={!dirty} onClick={save}>
          Save changes
        </Button>
      </div>
    </Card>
  );
}

function WorkspaceTab() {
  const members = useStore((s) => s.members);
  const invite = useStore((s) => s.inviteMember);
  const updateMember = useStore((s) => s.updateMember);
  const removeMember = useStore((s) => s.removeMember);
  const resetSampleData = useStore((s) => s.resetSampleData);
  const toast = useStore((s) => s.toast);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [wsName, setWsName] = useState('Tidepool');
  const [form, setForm] = useState({ name: '', email: '', role: 'Editor' as 'Admin' | 'Editor' | 'Viewer' });
  const [touched, setTouched] = useState(false);
  const errs = {
    name: form.name.trim().length < 2 ? 'Enter their name.' : undefined,
    email: !EMAIL.test(form.email)
      ? 'Enter a valid email address.'
      : members.some((m) => m.email.toLowerCase() === form.email.toLowerCase())
        ? 'This person is already in the workspace.'
        : undefined,
  };
  const send = () => {
    setTouched(true);
    if (errs.name || errs.email) return;
    invite({ name: form.name.trim(), email: form.email.trim(), role: form.role });
    toast(`Invitation sent to ${form.email.trim()}`);
    setInviteOpen(false);
    setForm({ name: '', email: '', role: 'Editor' });
    setTouched(false);
  };
  const removingMember = members.find((m) => m.id === removing);
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <CardHeader title="Workspace" subtitle="Shared by everyone at Tidepool who works on pricing." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="wsn">Workspace name</Label>
            <Input id="wsn" value={wsName} invalid={!wsName.trim()} onChange={(e) => setWsName(e.target.value)} />
            <FieldError>{!wsName.trim() ? 'Name is required.' : undefined}</FieldError>
          </div>
          <div>
            <Label htmlFor="wsd">Allowed email domain</Label>
            <Input id="wsd" value="tidepool.io" readOnly className="bg-sunken text-muted" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" disabled={!wsName.trim()} onClick={() => toast('Workspace settings saved')}>
            Save
          </Button>
        </div>
      </Card>
      <Card pad={false}>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-[15px] font-semibold">Members</div>
            <div className="text-[12.5px] text-muted">{members.length} people · 8 seats on the Team plan</div>
          </div>
          <Button variant="primary" icon={<Mail size={14} />} onClick={() => setInviteOpen(true)} disabled={members.length >= 8}>
            Invite member
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} size={30} />
                      <div>
                        <div className="font-medium text-ink">
                          {m.name} {m.id === 'm1' && <span className="text-faint">(you)</span>}
                        </div>
                        <div className="text-[12px] text-muted">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">{m.title}</td>
                  <td className="px-3 py-3">{m.status === 'Invited' ? <Badge tone="amber">Invited</Badge> : <span className="text-[12px] text-faint">Active {relativeTime(m.lastActive)}</span>}</td>
                  <td className="px-3 py-3">
                    <Select
                      className="h-8 w-28"
                      value={m.role}
                      disabled={m.id === 'm1'}
                      onChange={(e) => {
                        updateMember(m.id, { role: e.target.value as typeof m.role });
                        toast(`${m.name} is now ${e.target.value === 'Admin' ? 'an' : 'a'} ${e.target.value}`);
                      }}
                    >
                      <option>Admin</option>
                      <option>Editor</option>
                      <option>Viewer</option>
                    </Select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {m.id !== 'm1' && (
                      <Menu
                        trigger={({ toggle }) => (
                          <button onClick={toggle} aria-label={`Actions for ${m.name}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-sunken">
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                        items={[
                          ...(m.status === 'Invited' ? [{ label: 'Resend invitation', icon: <Mail size={14} />, onSelect: () => toast(`Invitation resent to ${m.email}`) }] : []),
                          { label: 'Remove from workspace', icon: <Trash2 size={14} />, danger: true, onSelect: () => setRemoving(m.id) },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-6">
        <CardHeader title="Sample data" subtitle="Restore the original studies, scenarios and memo. Your profile settings are kept." />
        <Button onClick={() => setResetOpen(true)}>Restore sample workspace</Button>
      </Card>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a teammate"
        description="They'll get an email with a link to join Tidepool on Goldilocks."
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={send}>
              Send invitation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="iname">Name</Label>
            <Input id="iname" value={form.name} invalid={touched && !!errs.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldError>{touched ? errs.name : undefined}</FieldError>
          </div>
          <div>
            <Label htmlFor="iemail">Email</Label>
            <Input id="iemail" type="email" placeholder="name@tidepool.io" value={form.email} invalid={touched && !!errs.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <FieldError>{touched ? errs.email : undefined}</FieldError>
          </div>
          <div>
            <Label htmlFor="irole">Role</Label>
            <Select id="irole" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}>
              <option>Admin</option>
              <option>Editor</option>
              <option>Viewer</option>
            </Select>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        open={!!removingMember}
        onClose={() => setRemoving(null)}
        title={`Remove ${removingMember?.name ?? ''}?`}
        description="They lose access immediately. Studies and memos they own stay in the workspace."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!removingMember) return;
          removeMember(removingMember.id);
          toast(`${removingMember.name} removed`);
        }}
      />
      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Restore the sample workspace?"
        description="Studies, scenarios, memos, members and notifications go back to their original state. This replaces anything you've added."
        confirmLabel="Restore"
        onConfirm={() => {
          resetSampleData();
          toast('Sample workspace restored');
        }}
      />
    </div>
  );
}

function DefaultsTab() {
  const defaults = useStore((s) => s.settings.defaults);
  const update = useStore((s) => s.updateSettings);
  const toast = useStore((s) => s.toast);
  const [form, setForm] = useState(defaults);
  const bad = form.targetResponses < 50 || form.targetResponses > 500;
  return (
    <Card className="p-6">
      <CardHeader title="Defaults" subtitle="Applied to new studies and analyses." />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="dcur">Currency</Label>
          <Select id="dcur" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="dbill">Billing period</Label>
          <Select id="dbill" value={form.billing} onChange={(e) => setForm({ ...form, billing: e.target.value as BillingPeriod })}>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="dtarget" hint="50–500">
            Target responses
          </Label>
          <Input id="dtarget" type="number" value={form.targetResponses} invalid={bad} onChange={(e) => setForm({ ...form, targetResponses: Number(e.target.value) })} />
          <FieldError>{bad ? 'Choose between 50 and 500.' : undefined}</FieldError>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2.5 pb-2 text-[13px] text-ink-2">
            <Switch checked={form.trimOutliers} onChange={(v) => setForm({ ...form, trimOutliers: v })} label="Trim outliers by default" />
            Trim outliers by default in analysis
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end border-t border-line pt-4">
        <Button
          variant="primary"
          disabled={bad || JSON.stringify(form) === JSON.stringify(defaults)}
          onClick={() => {
            update('defaults', form);
            toast('Defaults saved');
          }}
        >
          Save defaults
        </Button>
      </div>
    </Card>
  );
}

function NotificationsTab() {
  const n = useStore((s) => s.settings.notifications);
  const update = useStore((s) => s.updateSettings);
  const toast = useStore((s) => s.toast);
  const rows: [keyof Settings['notifications'], string, string][] = [
    ['milestones', 'Fielding milestones', 'When a study reaches 50% of its target'],
    ['completed', 'Study completed', 'When a study reaches its target and analysis is ready'],
    ['memoViews', 'Memo activity', 'When someone opens a memo you shared'],
    ['digest', 'Weekly digest', 'Monday summary of studies, scenarios and memos'],
  ];
  const channels: [keyof Settings['notifications'], string][] = [
    ['inApp', 'In-app'],
    ['email', 'Email'],
  ];
  const set = (k: keyof Settings['notifications'], v: boolean) => {
    update('notifications', { [k]: v });
    toast('Notification preferences updated');
  };
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <CardHeader title="What to notify me about" />
        <div className="divide-y divide-line">
          {rows.map(([k, title, desc]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-[13.5px] font-medium">{title}</div>
                <div className="text-[12.5px] text-muted">{desc}</div>
              </div>
              <Switch checked={n[k]} onChange={(v) => set(k, v)} label={title} />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <CardHeader title="Channels" />
        <div className="flex flex-wrap gap-6">
          {channels.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2.5 text-[13.5px]">
              <Switch checked={n[k]} onChange={(v) => set(k, v)} label={label} /> {label}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BillingTab() {
  const studies = useStore((s) => s.studies);
  const members = useStore((s) => s.members);
  const toast = useStore((s) => s.toast);
  const [plansOpen, setPlansOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const responses = studies.reduce((s, x) => s + x.responses.length, 0);
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[24px]">Team plan</span>
              <Badge tone="green">Active</Badge>
            </div>
            <div className="mt-1 text-[13px] text-muted">8 seats · $49 per seat / month · billed annually</div>
            <div className="mt-3 text-[13px] text-ink-2">
              Next invoice <b className="tabular">{money(392)}</b> on {shortDate('2026-10-01')}
            </div>
          </div>
          <Button onClick={() => setPlansOpen(true)}>Change plan</Button>
        </div>
        <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-3">
          {[
            ['Seats', members.length, 8],
            ['Survey responses this year', responses, 5000],
            ['Active studies', studies.filter((s) => s.status !== 'completed').length, 10],
          ].map(([label, used, cap]) => (
            <div key={label as string}>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-muted">{label}</span>
                <span className="font-medium tabular">
                  {num(used as number)} / {num(cap as number)}
                </span>
              </div>
              <Progress value={(used as number) / (cap as number)} className="mt-1.5 h-1.5" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <CardHeader title="Payment method" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[13.5px]">
            <span className="flex h-8 w-12 items-center justify-center rounded-md bg-[#1a1f71] text-[11px] font-bold text-white italic">VISA</span>
            <div>
              <div className="font-medium">Visa ending 4242</div>
              <div className="text-[12px] text-muted">Expires 08/2028 · finance@tidepool.io</div>
            </div>
          </div>
          <Button size="sm" onClick={() => toast('A secure billing-portal link was sent to finance@tidepool.io', 'info')}>
            Update
          </Button>
        </div>
      </Card>
      <Card pad={false}>
        <div className="px-5 py-4 text-[15px] font-semibold">Invoices</div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px] tabular">
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.id} className="border-t border-line">
                <td className="px-5 py-3 font-medium">{inv.id}</td>
                <td className="px-3 py-3 text-muted">{shortDate(inv.date)}</td>
                <td className="px-3 py-3">{money(inv.amount)}</td>
                <td className="px-3 py-3">
                  <Badge tone="green">{inv.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => toast(`${inv.id} emailed to finance@tidepool.io as PDF`)}>
                    PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <div className="text-right">
        <button className="text-[12.5px] font-medium text-muted hover:text-[#b42318]" onClick={() => setCancelOpen(true)}>
          Cancel subscription
        </button>
      </div>

      <Modal open={plansOpen} onClose={() => setPlansOpen(false)} title="Change plan" width="max-w-2xl" footer={<Button onClick={() => setPlansOpen(false)}>Close</Button>}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { name: 'Starter', price: '$19', note: 'per seat / mo', feats: ['3 seats', '2 active studies', '500 responses / yr'], current: false },
            { name: 'Team', price: '$49', note: 'per seat / mo', feats: ['Up to 15 seats', '10 active studies', '5,000 responses / yr', 'Packaging lab'], current: true },
            { name: 'Business', price: 'Custom', note: 'annual contract', feats: ['Unlimited seats', 'Multiple workspaces', 'SSO & audit logs', 'Panel sourcing'], current: false },
          ].map((p) => (
            <div key={p.name} className={clsx('rounded-xl border p-4', p.current ? 'border-brand-500 ring-3 ring-brand-500/15' : 'border-line')}>
              <div className="text-[14px] font-semibold">{p.name}</div>
              <div className="mt-1 text-[22px] font-semibold tabular">{p.price}</div>
              <div className="text-[12px] text-muted">{p.note}</div>
              <ul className="mt-3 space-y-1 text-[12.5px] text-ink-2">
                {p.feats.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Button
                size="sm"
                variant={p.current ? 'secondary' : 'primary'}
                disabled={p.current}
                className="mt-4 w-full"
                onClick={() => {
                  setPlansOpen(false);
                  toast(p.name === 'Business' ? 'Our team will reach out within one business day' : 'Downgrades take effect at your next renewal. We emailed the details.', 'info');
                }}
              >
                {p.current ? 'Current plan' : p.name === 'Business' ? 'Talk to sales' : 'Switch'}
              </Button>
            </div>
          ))}
        </div>
      </Modal>
      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel the Team plan?"
        description="Your workspace stays read-only until the end of the billing year (Apr 1, 2027). Only workspace admins can cancel."
        confirmLabel="Request cancellation"
        onConfirm={() => toast('Cancellation request sent to your account manager', 'info')}
      />
    </div>
  );
}
