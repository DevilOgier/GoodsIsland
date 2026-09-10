'use client';

export function PurchaseChannelPicker({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: [string, string][];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="channel-options" role="group" aria-label="购买渠道">
      <input type="hidden" name="purchaseChannel" value={value} />
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
