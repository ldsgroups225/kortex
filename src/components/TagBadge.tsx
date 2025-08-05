import { XMarkIcon } from '@heroicons/react/24/outline';

interface TagBadgeProps {
  tag: string;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  clickable?: boolean;
  removable?: boolean;
  color?: string;
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
];

export function TagBadge({
  tag,
  onClick,
  onRemove,
  className = '',
  clickable = false,
  removable = false,
  color
}: TagBadgeProps) {
  // Generate consistent color based on tag name
  const tagIndex = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const defaultColor = TAG_COLORS[tagIndex % TAG_COLORS.length];
  const tagColor = color || defaultColor;

  const baseClasses = `inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${tagColor}`;
  const clickableClasses = clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';
  const finalClasses = `${baseClasses} ${clickableClasses} ${className}`;

  return (
    <span className={finalClasses} onClick={clickable ? onClick : undefined}>
      <span>{tag}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
} 
