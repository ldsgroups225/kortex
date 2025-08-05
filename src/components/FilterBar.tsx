import { useState } from 'react';
import { ChevronDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  color?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  activeFilters: Record<string, string | string[]>;
  onFilterChange: (key: string, value: string | string[]) => void;
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  className = ''
}: FilterBarProps) {
  const { t } = useTranslation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const hasActiveFilters = Object.values(activeFilters).some(value =>
    Array.isArray(value) ? value.length > 0 : value !== ''
  );

  const handleFilterChange = (key: string, value: string | string[]) => {
    onFilterChange(key, value);
    setOpenDropdown(null);
  };

  const clearFilter = (key: string) => {
    const config = filters.find(f => f.key === key);
    if (config?.multiSelect) {
      onFilterChange(key, []);
    } else {
      onFilterChange(key, '');
    }
  };

  const getActiveFilterLabel = (key: string) => {
    const config = filters.find(f => f.key === key);
    const value = activeFilters[key];

    if (!value || (Array.isArray(value) && value.length === 0)) return '';

    if (Array.isArray(value)) {
      if (value.length === 1) {
        const option = config?.options.find(opt => opt.value === value[0]);
        return option?.label || value[0];
      }
      return `${value.length} selected`;
    }

    const option = config?.options.find(opt => opt.value === value);
    return option?.label || value;
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {filters.map((filter) => {
        const isOpen = openDropdown === filter.key;
        const hasValue = activeFilters[filter.key] &&
          (Array.isArray(activeFilters[filter.key])
            ? activeFilters[filter.key].length > 0
            : activeFilters[filter.key] !== '');

        return (
          <div key={filter.key} className="relative">
            <button
              onClick={() => setOpenDropdown(isOpen ? null : filter.key)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${hasValue
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
            >
              <FunnelIcon className="h-4 w-4" />
              <span>{filter.label}</span>
              {hasValue && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded-full">
                  {Array.isArray(activeFilters[filter.key])
                    ? activeFilters[filter.key].length
                    : '1'}
                </span>
              )}
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-2">
                  {filter.options.map((option) => {
                    const isSelected = filter.multiSelect
                      ? Array.isArray(activeFilters[filter.key]) && activeFilters[filter.key].includes(option.value)
                      : activeFilters[filter.key] === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (filter.multiSelect) {
                            const currentValues = Array.isArray(activeFilters[filter.key])
                              ? activeFilters[filter.key] as string[]
                              : [];
                            const newValues = isSelected
                              ? currentValues.filter((v: string) => v !== option.value)
                              : [...currentValues, option.value];
                            handleFilterChange(filter.key, newValues);
                          } else {
                            handleFilterChange(filter.key, isSelected ? '' : option.value);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${isSelected
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {option.count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasValue && (
              <button
                onClick={() => clearFilter(filter.key)}
                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}

      {hasActiveFilters && onClearAll && (
        <button
          onClick={onClearAll}
          className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          {t('common.clearAll')}
        </button>
      )}
    </div>
  );
} 
