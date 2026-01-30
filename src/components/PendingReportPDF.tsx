import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AlertData {
  id: string;
  shipment_id: string;
  alert_type: string;
  detected_at: string;
  driver_name: string | null;
  driver_phone: string | null;
  order_id: string | null;
  pack_id: string | null;
  cliente_nome: string | null;
  cidade: string | null;
  estado: string | null;
}

interface GeneratePDFOptions {
  alerts: AlertData[];
  filterDriver?: string;
  title?: string;
}

export function generatePendingReportPDF({ alerts, filterDriver, title }: GeneratePDFOptions) {
  const doc = new jsPDF();
  
  // Título
  const reportTitle = title || "Relatório de Pendências - RASTREIO FLEX";
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(reportTitle, 14, 20);
  
  // Data de geração
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} BRT`, 14, 28);
  
  if (filterDriver && filterDriver !== "all") {
    doc.text(`Motorista: ${filterDriver}`, 14, 34);
  }
  
  // Resumo
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total de pendências: ${alerts.length}`, 14, filterDriver ? 42 : 36);
  
  // Tabela de dados
  const tableData = alerts.map((alert, index) => {
    const diasAtraso = Math.floor(
      (new Date().getTime() - new Date(alert.detected_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return [
      (index + 1).toString(),
      alert.shipment_id,
      alert.order_id || alert.pack_id || "-",
      alert.cliente_nome || "-",
      alert.driver_name || "Sem motorista",
      alert.cidade && alert.estado ? `${alert.cidade}/${alert.estado}` : "-",
      format(new Date(alert.detected_at), "dd/MM/yyyy", { locale: ptBR }),
      `${diasAtraso} dia(s)`,
    ];
  });
  
  autoTable(doc, {
    head: [["#", "Envio", "Pedido", "Cliente", "Motorista", "Local", "Data Alerta", "Atraso"]],
    body: tableData,
    startY: filterDriver ? 48 : 42,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 },
      7: { cellWidth: 15 },
    },
  });
  
  // Área de assinatura
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  if (finalY < 250) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Declaro que recebi os pacotes listados acima para devolução:", 14, finalY);
    
    // Linha de assinatura
    doc.line(14, finalY + 25, 90, finalY + 25);
    doc.text("Assinatura do Responsável", 14, finalY + 30);
    
    doc.line(110, finalY + 25, 196, finalY + 25);
    doc.text("Data", 110, finalY + 30);
  }
  
  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${pageCount} - RASTREIO FLEX`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
  
  // Salvar
  const fileName = `pendencias_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`;
  doc.save(fileName);
  
  return fileName;
}
