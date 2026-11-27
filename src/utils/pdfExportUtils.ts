import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessTrip, Department, Employee } from '../types/trip';
import { formatIndonesianDate, NAMA_BULAN, getDatesBetween } from './dateUtils';

interface GenerateRecapPdfParams {
  trips: BusinessTrip[];
  departments: Department[];
  employees: Employee[];
  currentDate: Date;
  selectedBidangName?: string;
  signerJabatan?: string;
  signerNama?: string;
  signerNip?: string;
}

export function generateRecapPDF({
  trips,
  departments,
  employees,
  currentDate,
  selectedBidangName,
  signerJabatan,
  signerNama,
  signerNip,
}: GenerateRecapPdfParams) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const deptsMap = new Map(departments.map((d) => [d.id, d]));
  const empsMap = new Map(employees.map((e) => [e.id, e]));

  // Filter trips for this month and sort by date
  const monthTrips = trips
    .filter((trip) => {
      const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
      return dates.some((d) => {
        const [y, m] = d.split('-').map(Number);
        return y === currentYear && m === currentMonth + 1;
      });
    })
    .sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));

  // Count total for year
  const yearTrips = trips.filter((trip) => {
    const dates = getDatesBetween(trip.tanggalMulai, trip.tanggalSelesai);
    return dates.some((d) => {
      const [y] = d.split('-').map(Number);
      return y === currentYear;
    });
  });

  // Header / Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('REKAPITULASI SURAT PERINTAH TUGAS & PERJALANAN DINAS (SIM-SPPD)', 148.5, 16, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `PERIODE: ${NAMA_BULAN[currentMonth].toUpperCase()} ${currentYear} ${
      selectedBidangName ? `• ${selectedBidangName}` : ''
    }`,
    148.5,
    22,
    { align: 'center' }
  );

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total Kegiatan Bulan Ini: ${monthTrips.length} | Total Kegiatan Tahun ${currentYear}: ${yearTrips.length} | Proteksi Kesalahan Jadwal Harian: Aktif`,
    148.5,
    27,
    { align: 'center' }
  );

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 30, 283, 30);

  // Table Body Rows
  const tableRows = monthTrips.map((trip, idx) => {
    const dept = deptsMap.get(trip.bidangId);
    const deptStr = dept ? `[${dept.inisial}]\n${dept.nama}` : '-';

    const staffList = trip.karyawanIds
      .map((id) => empsMap.get(id))
      .filter(Boolean) as Employee[];

    const staffStr = staffList
      .map((e, sIdx) => `${sIdx + 1}. ${e.nama}${e.nip ? ` (${e.nip})` : ''} - ${e.jabatan}`)
      .join('\n');

    let dateStr = formatIndonesianDate(trip.tanggalMulai);
    if (trip.tanggalMulai !== trip.tanggalSelesai) {
      dateStr += ` s/d\n${formatIndonesianDate(trip.tanggalSelesai)}`;
    }

    const tujuanTransport = `${trip.tujuan}\n(Moda: ${trip.transportasi || 'Kendaraan Dinas'}${
      trip.biayaAnggaran ? ` • ${trip.biayaAnggaran}` : ''
    })`;

    return [
      (idx + 1).toString(),
      trip.nomorSurat || '-',
      deptStr,
      trip.namaKegiatan,
      tujuanTransport,
      dateStr,
      staffStr || '-',
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(['-', '-', '-', 'Tidak ada data perjalanan dinas untuk periode ini.', '-', '-', '-']);
  }

  // Generate Table
  autoTable(doc, {
    startY: 33,
    head: [
      [
        'No',
        'No. Surat Tugas',
        'Bidang Perintah',
        'Kegiatan / Tugas',
        'Tujuan & Sarana Transportasi',
        'Tanggal',
        'Pegawai Pelaksana',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'top',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 35 },
      3: { cellWidth: 50 },
      4: { cellWidth: 42 },
      5: { cellWidth: 30 },
      6: { cellWidth: 'auto' },
    },
    foot: [],
    didDrawPage: (data) => {
      // Page footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Dicetak otomatis oleh SIM-SPPD pada ${formatIndonesianDate(
          new Date().toISOString().split('T')[0],
          true
        )} • Proteksi Kesalahan Jadwal Harian`,
        14,
        200
      );
      doc.text(`Halaman ${data.pageNumber} dari ${pageCount}`, 283, 200, { align: 'right' });
    },
  });

  // Tanda Tangan Section on final page if room, or next page
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  let signatureY = finalY + 12;

  if (signatureY > 175) {
    doc.addPage();
    signatureY = 25;
  }

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  doc.text('Keterangan & Catatan:', 14, signatureY);
  doc.text('1. Setiap data perjalanan telah diverifikasi terbebas dari bentrok jadwal harian.', 14, signatureY + 5);
  doc.text('2. Dokumen ini sah dan diterbitkan sebagai rekapitulasi penugasan dinas resmi.', 14, signatureY + 9);

  // Signature box on the right
  const sigRightX = 230;
  doc.text('Mengetahui,', sigRightX, signatureY, { align: 'center' });
  doc.text(signerJabatan || 'Pejabat Pembina Kepegawaian', sigRightX, signatureY + 4, { align: 'center' });

  const nameText = signerNama ? `( ${signerNama} )` : '( ........................................................... )';
  const nipText = signerNip ? `NIP. ${signerNip}` : 'NIP. ....................................................';
  doc.text(nameText, sigRightX, signatureY + 22, {
    align: 'center',
  });
  doc.text(nipText, sigRightX, signatureY + 26, {
    align: 'center',
  });

  // Save the PDF
  const filename = `Rekap_SPPD_${NAMA_BULAN[currentMonth]}_${currentYear}.pdf`;
  doc.save(filename);
}

export function generateSingleTripPDF(trip: BusinessTrip, departments: Department[], employees: Employee[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const deptsMap = new Map(departments.map((d) => [d.id, d]));
  const empsMap = new Map(employees.map((e) => [e.id, e]));
  const dept = deptsMap.get(trip.bidangId);
  const staff = trip.karyawanIds.map((id) => empsMap.get(id)).filter(Boolean) as Employee[];

  // Header Kop
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('SURAT PERINTAH TUGAS & PERJALANAN DINAS (SPPD)', 105, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nomor: ${trip.nomorSurat}`, 105, 24, { align: 'center' });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(15, 28, 195, 28);

  // Details
  const infoRows = [
    ['1.', 'Bidang Pemberi Perintah', `: [${dept?.inisial || 'DINAS'}] ${dept?.nama || '-'}`],
    ['2.', 'Maksud / Kegiatan', `: ${trip.namaKegiatan}`],
    ['3.', 'Kota / Lokasi Tujuan', `: ${trip.tujuan}`],
    ['4.', 'Sarana Transportasi', `: ${trip.transportasi || 'Kendaraan Dinas'}`],
    ['5.', 'Pembebanan Anggaran', `: ${trip.biayaAnggaran || 'DIPA Satker'}`],
    [
      '6.',
      'Waktu Pelaksanaan',
      `: ${formatIndonesianDate(trip.tanggalMulai)}${
        trip.tanggalMulai !== trip.tanggalSelesai ? ` s/d ${formatIndonesianDate(trip.tanggalSelesai)}` : ''
      }`,
    ],
  ];

  autoTable(doc, {
    startY: 33,
    body: infoRows,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
    },
  });

  const nextY = (doc as any).lastAutoTable?.finalY || 80;

  // Staff Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Daftar Pegawai Yang Ditugaskan:', 15, nextY + 8);

  const staffRows = staff.map((emp, i) => [
    (i + 1).toString(),
    emp.nama,
    emp.nip || '-',
    emp.pangkatGol || '-',
    emp.jabatan,
    dept?.inisial || '-',
  ]);

  autoTable(doc, {
    startY: nextY + 12,
    head: [['No', 'Nama Pegawai', 'NIP', 'Pangkat/Gol', 'Jabatan', 'Bidang']],
    body: staffRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 32 },
      4: { cellWidth: 35 },
      5: { cellWidth: 15, halign: 'center' },
    },
  });

  const finalStaffY = (doc as any).lastAutoTable?.finalY || 140;

  if (trip.keterangan) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Keterangan / Catatan Tugas:', 15, finalStaffY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(trip.keterangan, 15, finalStaffY + 13, { maxWidth: 180 });
  }

  // Signature
  const sigY = Math.max(finalStaffY + (trip.keterangan ? 25 : 15), 210);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Dikeluarkan pada tanggal: ' + formatIndonesianDate(trip.tanggalMulai), 130, sigY);
  doc.text('Pejabat Pembuat Komitmen / Pembina,', 130, sigY + 5);

  doc.text('( ...................................................... )', 130, sigY + 28);
  doc.text('NIP. ...............................................', 130, sigY + 33);

  // Footer notes
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('SIM-SPPD • Proteksi Kesalahan Jadwal Harian • Dokumen Resmi Penugasan', 15, 285);

  const cleanSurat = trip.nomorSurat.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`SPPD_${cleanSurat}.pdf`);
}
