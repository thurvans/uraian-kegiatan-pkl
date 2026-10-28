import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { PNG } from 'pngjs';
import { formatDateId } from '../lib/dates.js';

// Mengikuti template Word: margin 1 inci dan tabel 9.000 twip (450 pt).
const margins = { top: 72, bottom: 72, left: 72, right: 72 };
const widths = [35.75, 76.5, 58.5, 190.75, 88.5];
const tableWidth = widths.reduce((total, width) => total + width, 0);
const signatureCache = new Map();
const SIGNATURE_CACHE_LIMIT = 100;

function normalizedSignature(filePath) {
  if (signatureCache.has(filePath)) return signatureCache.get(filePath);
  try {
    const source = PNG.sync.read(fs.readFileSync(filePath));
    let minX = source.width, minY = source.height, maxX = -1, maxY = -1;
    const isInk = offset => source.data[offset + 3] > 5
      && (source.data[offset] < 245 || source.data[offset + 1] < 245 || source.data[offset + 2] < 245);

    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const offset = (source.width * y + x) * 4;
        if (!isInk(offset)) continue;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return filePath;

    const inkWidth = maxX - minX + 1, inkHeight = maxY - minY + 1;
    const padding = Math.max(3, Math.round(Math.max(inkWidth, inkHeight) * .06));
    const output = new PNG({ width: inkWidth + padding * 2, height: inkHeight + padding * 2 });
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const sourceOffset = (source.width * y + x) * 4;
        if (!isInk(sourceOffset)) continue;
        const targetX = x - minX + padding, targetY = y - minY + padding;
        const targetOffset = (output.width * targetY + targetX) * 4;
        output.data[targetOffset] = 0;
        output.data[targetOffset + 1] = 0;
        output.data[targetOffset + 2] = 0;
        output.data[targetOffset + 3] = source.data[sourceOffset + 3];
      }
    }
    const result = PNG.sync.write(output);
    if (signatureCache.size >= SIGNATURE_CACHE_LIMIT) {
      signatureCache.delete(signatureCache.keys().next().value);
    }
    signatureCache.set(filePath, result);
    return result;
  } catch {
    return filePath;
  }
}

function centered(doc, text, size = 10, bold = false) {
  doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(size).text(text, { align: 'center' });
}

function reportHeader(doc, report, showDocumentTitle) {
  const p = report.placement;
  if (showDocumentTitle) {
    centered(doc, 'URAIAN KEGIATAN PRAKTIK KERJA LAPANGAN', 12, true);
    centered(doc, p.officeName.toUpperCase(), 10, true);
    centered(doc, p.region.toUpperCase(), 10, true);
    centered(doc, `BAGIAN ${p.division.toUpperCase()}`, 10, true);
    doc.moveDown(.45);
    centered(doc, `BERTUGAS SEBAGAI : ${p.position.toUpperCase()}`, 9, true);
    centered(doc, `PERIODE : ${formatDateId(p.startDate).replace(/^\S+, /, '')} S/D ${formatDateId(p.endDate).replace(/^\S+, /, '')}`, 9, true);
  }

  doc.moveDown(showDocumentTitle ? .3 : 0).font('Times-Roman').fontSize(9);
  const labelY = doc.y;
  doc.text(`MINGGU KE : ${report.weekIndex}`, margins.left, labelY, { width: tableWidth / 2, align: 'left' });
  doc.text(`BULAN KE : ${report.monthIndex}`, margins.left + tableWidth / 2, labelY, { width: tableWidth / 2, align: 'right' });
  doc.y = labelY + 14;
}

function drawGridRow(doc, y, height, fillColor) {
  doc.save();
  if (fillColor) doc.rect(margins.left, y, tableWidth, height).fill(fillColor);
  doc.lineWidth(.5).strokeColor('#000000').rect(margins.left, y, tableWidth, height).stroke();
  let x = margins.left;
  widths.slice(0, -1).forEach(width => {
    x += width;
    doc.moveTo(x, y).lineTo(x, y + height).stroke();
  });
  doc.restore();
}

function tableHeader(doc) {
  const labels = ['NO', 'HARI /\nTANGGAL', 'WAKTU', 'JENIS KEGIATAN', 'TANDA\nTANGAN'];
  const y = doc.y;
  const height = 34;
  let x = margins.left;
  drawGridRow(doc, y, height, '#E7E6E6');
  doc.font('Times-Bold').fontSize(7.5).fillColor('#000000');
  widths.forEach((width, index) => {
    const options = { width: width - 6, align: 'center', lineGap: 0 };
    const textHeight = doc.heightOfString(labels[index], options);
    doc.text(labels[index], x + 3, y + (height - textHeight) / 2, options);
    x += width;
  });
  doc.y = y + height;
}

function drawRow(doc, report, activity, index) {
  const signaturePath = report.signatureVersion?.filePath;
  const descriptionOptions = { width: widths[3] - 10, lineGap: 1 };
  const descriptionHeight = doc.font('Times-Roman').fontSize(8.5).heightOfString(activity.description, descriptionOptions);
  const rowHeight = Math.max(46, Math.min(160, descriptionHeight + 12));
  if (doc.y + rowHeight > doc.page.height - margins.bottom) {
    doc.addPage();
    tableHeader(doc);
  }

  const y = doc.y;
  let x = margins.left;
  const values = [
    String(index + 1),
    formatDateId(activity.activityDate),
    activity.startTime === 'WFH'
      ? 'WFH'
      : `${activity.startTime.replace(':', '.')} s/d ${activity.endTime.replace(':', '.')}`,
    activity.description
  ];
  drawGridRow(doc, y, rowHeight);
  values.forEach((value, columnIndex) => {
    const fontSize = columnIndex === 3 ? 8.5 : 8;
    const options = {
      width: widths[columnIndex] - 8,
      align: columnIndex === 3 ? 'left' : 'center',
      height: rowHeight - 10,
      ellipsis: true,
      lineGap: 1
    };
    doc.font('Times-Roman').fontSize(fontSize).fillColor('#000000');
    const textHeight = doc.heightOfString(value, options);
    const textY = columnIndex === 3 ? y + 5 : y + Math.max(5, (rowHeight - textHeight) / 2);
    doc.text(value, x + 4, textY, options);
    x += widths[columnIndex];
  });

  if (signaturePath && fs.existsSync(signaturePath)) {
    try {
      doc.image(normalizedSignature(signaturePath), x + 4, y + 4, {
        fit: [widths[4] - 8, rowHeight - 8],
        align: 'center',
        valign: 'center'
      });
    } catch {}
  }
  doc.y = y + rowHeight;
}

export async function buildPdf(res, reports, fileName) {
  const doc = new PDFDocument({
    size: 'A4',
    margins,
    info: { Title: 'Uraian Kegiatan Praktik Kerja Lapangan', Author: 'Sistem Uraian Kegiatan PKL' }
  });
  res.type('application/pdf').attachment(fileName);
  doc.pipe(res);

  reports.forEach((report, reportIndex) => {
    if (reportIndex > 0 && reportIndex % 2 === 0) {
      doc.addPage();
    } else if (reportIndex > 0) {
      doc.moveDown(1.1);
    }
    reportHeader(doc, report, reportIndex === 0);
    tableHeader(doc);
    report.activities.forEach((activity, index) => drawRow(doc, report, activity, index));
  });
  doc.end();
}

