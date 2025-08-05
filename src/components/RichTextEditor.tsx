import {
  BoldIcon,
  CodeBracketIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  NumberedListIcon,
} from '@heroicons/react/24/outline'
import Link from '@tiptap/extension-link'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

// Move ToolbarButton to top level
function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void
  isActive?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        isActive ? 'bg-gray-200 dark:bg-gray-600' : ''
      }`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  content,
  onChange,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-800">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <BoldIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <CodeBracketIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <ListBulletIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <NumberedListIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task List"
        >
          <input type="checkbox" className="h-4 w-4" readOnly />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => {
            // TODO: Replace with proper URL input dialog
            const url = 'https://example.com' // Placeholder
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <span className="text-sm font-bold">H1</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span className="text-sm font-bold">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <span className="text-sm font-bold">H3</span>
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="p-4 min-h-[200px] bg-white dark:bg-gray-900">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
