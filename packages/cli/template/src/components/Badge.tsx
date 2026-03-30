type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'outline';

const variants: Record<BadgeVariant, string> = {
  default: 'badge-default',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  outline: 'badge-outline',
};

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return <span className={`badge not-prose ${variants[variant]}`}>{children}</span>;
}
