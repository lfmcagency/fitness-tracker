'use client';

import { useState, useEffect } from 'react';

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}

export default function Tabs({ defaultValue, className = '', children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  useEffect(() => {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    const handleTabClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const tabId = target.getAttribute('data-tab');
      if (tabId) setActiveTab(tabId);
    };

    tabButtons.forEach(button => {
      button.addEventListener('click', handleTabClick);
    });

    return () => {
      tabButtons.forEach(button => {
        button.removeEventListener('click', handleTabClick);
      });
    };
  }, []);

  useEffect(() => {
    const tabButtons = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    tabButtons.forEach(button => {
      const tabId = button.getAttribute('data-tab');
      if (tabId === activeTab) {
        button.classList.remove('border-transparent', 'text-gray-500');
        button.classList.add('border-blue-500', 'text-blue-600');
      } else {
        button.classList.add('border-transparent', 'text-gray-500');
        button.classList.remove('border-blue-500', 'text-blue-600');
      }
    });

    tabContents.forEach(content => {
      const tabId = content.getAttribute('data-tab-content');
      content.classList.toggle('hidden', tabId !== activeTab);
    });
  }, [activeTab]);

  return <div className={className}>{children}</div>;
}