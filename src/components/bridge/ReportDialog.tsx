'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Download } from 'lucide-react'
import { toast } from 'sonner'
import { exportReportToPdf } from '@/lib/pdf-export'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: 'day' | 'night'
  content: string
  bridgeName: string
}

export default function ReportDialog({
  open,
  onOpenChange,
  theme,
  content,
  bridgeName,
}: ReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme === 'night' ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-gray-200'} max-w-3xl max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>
            <FileText className="w-5 h-5" />
            桥梁安全报告
          </DialogTitle>
          <DialogDescription className={theme === 'night' ? 'text-slate-400' : 'text-gray-500'}>
            桥梁步行板状况汇总及人员作业走行建议
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[60vh]">
            <div id="report-content" className={`prose prose-sm max-w-none ${theme === 'night' ? 'prose-invert' : ''}`}>
              {content.split('\n').map((line, i) => {
                // 标题
                if (line.startsWith('# ')) {
                  return <h1 key={i} className={`text-2xl font-bold mb-4 ${theme === 'night' ? 'text-cyan-400' : 'text-blue-600'}`}>{line.slice(2)}</h1>
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className={`text-xl font-bold mt-6 mb-3 ${theme === 'night' ? 'text-cyan-300' : 'text-blue-600'}`}>{line.slice(3)}</h2>
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className={`text-lg font-bold mt-4 mb-2 ${theme === 'night' ? 'text-cyan-200' : 'text-blue-500'}`}>{line.slice(4)}</h3>
                }
                // 列表项
                if (line.startsWith('- ')) {
                  return <p key={i} className={`ml-4 my-1 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>• {line.slice(2)}</p>
                }
                if (line.match(/^\d+\./)) {
                  return <p key={i} className={`ml-4 my-1 ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>{line}</p>
                }
                // 表格
                if (line.startsWith('|')) {
                  return <div key={i} className={`font-mono text-sm ${theme === 'night' ? 'text-slate-300' : 'text-gray-600'}`}>{line}</div>
                }
                // 分隔线
                if (line.startsWith('---')) {
                  return <hr key={i} className={`my-4 ${theme === 'night' ? 'border-slate-700' : 'border-gray-200'}`} />
                }
                // 粗体文本
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className={`font-bold ${theme === 'night' ? 'text-white' : 'text-gray-900'}`}>{line.slice(2, -2)}</p>
                }
                // 列表项带 *
                if (line.startsWith('*')) {
                  return <p key={i} className={`text-sm italic mt-4 ${theme === 'night' ? 'text-slate-400' : 'text-gray-500'}`}>{line}</p>
                }
                // 空行
                if (line.trim() === '') {
                  return <div key={i} className="h-2" />
                }
                // 普通文本
                return <p key={i} className={theme === 'night' ? 'text-slate-300' : 'text-gray-600'}>{line}</p>
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className={theme === 'night' ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-700'}>关闭</Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(content)
              toast.success('报告已复制到剪贴板')
            }}
            className={theme === 'night' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-500'}
          >
            复制报告
          </Button>
          <Button
            onClick={async () => {
              try {
                const date = new Date().toISOString().slice(0, 10)
                await exportReportToPdf('report-content', `桥梁报告_${bridgeName}_${date}.pdf`)
                toast.success('PDF报告已生成并下载')
              } catch (err) {
                console.error('导出PDF失败:', err)
                toast.error('导出PDF失败，请重试')
              }
            }}
            className={theme === 'night' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
          >
            <Download className="w-4 h-4 mr-1" />
            导出PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
