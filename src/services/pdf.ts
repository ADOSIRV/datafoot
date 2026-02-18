import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PerformanceSession, Profile, PlayerStats } from '../types';

interface PDFOptions {
  player: Profile;
  sessions: PerformanceSession[];
  stats: PlayerStats;
  chartElementId?: string;
  title?: string;
}

export async function generatePlayerPDF(options: PDFOptions): Promise<Blob> {
  const { player, sessions, stats, chartElementId, title } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // primary-600
  doc.rect(0, 0, pageW, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DataFoot', margin, 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title ?? 'Rapport de performance', margin, 23);
  doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, pageW - margin, 23, { align: 'right' });

  y = 45;

  // ── Player info ───────────────────────────────────────────
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${player.first_name} ${player.last_name}`, margin, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  y += 6;
  const posLabel = positionLabel(player.position);
  doc.text(`Poste : ${posLabel}  |  Équipe : ${player.team?.name ?? '-'}  |  Club : ${player.club?.name ?? '-'}`, margin, y);
  if (player.date_of_birth) {
    y += 5;
    doc.text(`Date de naissance : ${format(new Date(player.date_of_birth), 'dd/MM/yyyy')}`, margin, y);
  }

  y += 10;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Stats cards ───────────────────────────────────────────
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistiques générales', margin, y);
  y += 7;

  const statItems = [
    { label: 'Sessions', value: String(stats.total_sessions) },
    { label: 'Meilleur total', value: String(stats.best_total) },
    { label: 'Moy. total', value: String(stats.avg_total) },
    { label: 'Moy. pied D', value: String(stats.avg_right_foot) },
    { label: 'Moy. pied G', value: String(stats.avg_left_foot) },
    { label: 'Moy. tête', value: String(stats.avg_head) },
  ];

  const colW = (pageW - 2 * margin) / 3;
  statItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = margin + col * colW;
    const by = y + row * 20;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(bx, by, colW - 3, 17, 2, 2, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(item.value, bx + colW / 2 - 1.5, by + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(item.label, bx + colW / 2 - 1.5, by + 15, { align: 'center' });
  });

  y += Math.ceil(statItems.length / 3) * 20 + 8;

  // ── Chart (if element provided) ───────────────────────────
  if (chartElementId) {
    const chartEl = document.getElementById(chartElementId);
    if (chartEl) {
      const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const imgW = pageW - 2 * margin;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (y + imgH > pageH - margin) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Courbe de progression', margin, y);
      y += 5;
      doc.addImage(imgData, 'PNG', margin, y, imgW, imgH);
      y += imgH + 8;
    }
  }

  // ── Sessions table ────────────────────────────────────────
  if (y + 30 > pageH - margin) { doc.addPage(); y = margin; }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Historique des sessions', margin, y);
  y += 7;

  const headers = ['Date', 'Pied Droit', 'Pied Gauche', 'Tête', 'Total', 'Commentaire'];
  const colWidths = [28, 22, 25, 18, 18, 70];
  let cx = margin;
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y - 4, pageW - 2 * margin, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  headers.forEach((h, i) => {
    doc.text(h, cx + 2, y);
    cx += colWidths[i];
  });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const maxSessions = 30;
  const shown = sessions.slice(0, maxSessions);
  shown.forEach((s, idx) => {
    if (y > pageH - margin) { doc.addPage(); y = margin; }
    if (idx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 3, pageW - 2 * margin, 6, 'F');
    }
    doc.setTextColor(31, 41, 55);
    cx = margin;
    const row = [
      format(new Date(s.session_date), 'dd/MM/yyyy'),
      String(s.right_foot),
      String(s.left_foot),
      String(s.head),
      String(s.total),
      s.comment?.slice(0, 40) ?? '',
    ];
    row.forEach((val, i) => {
      doc.text(val, cx + 2, y);
      cx += colWidths[i];
    });
    y += 6;
  });

  if (sessions.length > maxSessions) {
    y += 3;
    doc.setTextColor(107, 114, 128);
    doc.text(`... et ${sessions.length - maxSessions} sessions supplémentaires`, margin, y);
  }

  // ── Footer ────────────────────────────────────────────────
  const totalPages = (doc.internal as { pages: unknown[] }).pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`DataFoot — ${format(new Date(), 'yyyy')}`, margin, pageH - 8);
    doc.text(`Page ${i} / ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  return doc.output('blob');
}

function positionLabel(pos?: string): string {
  const map: Record<string, string> = {
    goalkeeper: 'Gardien', defender: 'Défenseur',
    midfielder: 'Milieu', forward: 'Attaquant', unknown: 'Inconnu',
  };
  return pos ? (map[pos] ?? pos) : '-';
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
