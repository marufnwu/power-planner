import { useState } from 'react';
import { Project, SimulationResult } from '../types';
import { runSimulation, calculateSizing, calculateCosts } from '../lib/engine/calculator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, Building2, User, Mail, Phone } from 'lucide-react';

interface ProposalGeneratorProps {
  project: Project;
  result: SimulationResult;
}

export function ProposalGenerator({ project, result }: ProposalGeneratorProps) {
  const [companyName, setCompanyName] = useState('Your Company Name');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectName, setProjectName] = useState('IPS/Solar System Proposal');
  const [validDays, setValidDays] = useState(30);
  const [notes, setNotes] = useState('');

  const sizing = calculateSizing(project);
  const costs = calculateCosts(project, result);

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header with company name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Power System Solutions', 20, 32);
    
    // Line separator
    doc.setDrawColor(255, 77, 28);
    doc.setLineWidth(1);
    doc.line(20, 37, pageWidth - 20, 37);
    
    // Proposal title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(projectName, 20, 50);
    
    // Client details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 60;
    
    if (clientName) {
      doc.text(`Prepared for: ${clientName}`, 20, yPos);
      yPos += 5;
    }
    if (clientEmail) {
      doc.text(`Email: ${clientEmail}`, 20, yPos);
      yPos += 5;
    }
    if (clientPhone) {
      doc.text(`Phone: ${clientPhone}`, 20, yPos);
      yPos += 5;
    }
    
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Valid for: ${validDays} days`, 20, yPos);
    
    // System Overview
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('System Overview', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const totalLoad = project.loads.reduce((sum, l) => sum + l.qty * l.watts, 0);
    const totalVA = project.loads.reduce((sum, l) => sum + (l.qty * l.watts) / l.powerFactor, 0);
    
    doc.text(`Total Connected Load: ${totalLoad}W (${totalVA.toFixed(0)} VA)`, 20, yPos);
    yPos += 5;
    doc.text(`Recommended Inverter: ${sizing.recommendedVA} VA`, 20, yPos);
    yPos += 5;
    doc.text(`Battery Capacity: ${project.bank.unit.ratedAh}Ah ${project.bank.unit.chemistry.toUpperCase()}`, 20, yPos);
    yPos += 5;
    if (project.pv) {
      const solarWp = project.pv.panel.wp * project.pv.series * project.pv.parallelStrings;
      doc.text(`Solar Array: ${solarWp} Wp`, 20, yPos);
      yPos += 5;
    }
    doc.text(`Expected Runtime: ${result.continuousRuntime.toFixed(1)} hours`, 20, yPos);
    yPos += 5;
    doc.text(`Recovery Status: ${result.recoveryStatus === 'yes' ? '✓ Recovers between outages' : '⚠ May not recover'}`, 20, yPos);
    
    // Bill of Materials
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill of Materials', 20, yPos);
    yPos += 5;
    
    const bomData = [
      ['Item', 'Specification', 'Qty', 'Unit Price', 'Total'],
      ['Inverter', `${project.inverter.ratedVA}VA ${project.inverter.systemVoltage}V`, '1', '৳15,000', '৳15,000'],
      ['Battery', `${project.bank.unit.ratedAh}Ah ${project.bank.unit.chemistry.toUpperCase()}`, 
       `${project.bank.series * project.bank.parallel}`, 
       `৳${(project.bank.unit.price || 0).toLocaleString()}`,
       `৳${((project.bank.unit.price || 0) * project.bank.series * project.bank.parallel).toLocaleString()}`],
    ];
    
    if (project.pv) {
      const solarWp = project.pv.panel.wp * project.pv.series * project.pv.parallelStrings;
      const panelCount = project.pv.series * project.pv.parallelStrings;
      bomData.push(['Solar Panel', `${project.pv.panel.wp}Wp`, `${panelCount}`, 
                    `৳${(project.pv.panel.price || 0).toLocaleString()}`,
                    `৳${((project.pv.panel.price || 0) * panelCount).toLocaleString()}`]);
    }
    
    // Installation
    bomData.push(['Installation & Wiring', 'Professional installation', '1', '৳5,000', '৳5,000']);
    
    // Calculate total
    const batteryTotal = (project.bank.unit.price || 0) * project.bank.series * project.bank.parallel;
    const solarTotal = project.pv ? (project.pv.panel.price || 0) * project.pv.series * project.pv.parallelStrings : 0;
    const grandTotal = 15000 + batteryTotal + solarTotal + 5000;
    
    bomData.push(['', '', '', 'Total:', `৳${grandTotal.toLocaleString()}`]);
    
    autoTable(doc, {
      head: [bomData[0]],
      body: bomData.slice(1),
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [255, 77, 28] },
      styles: { fontSize: 9 },
    });
    
    // Performance Analysis
    yPos = (doc as any).lastAutoTable.finalY + 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Analysis', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const performanceData = [
      ['Metric', 'Value'],
      ['Continuous Runtime', `${result.continuousRuntime.toFixed(1)} hours`],
      ['Recharge Time', `${result.closedFormRecharge.toFixed(1)} hours`],
      ['Minimum SoC', `${result.minSoC.toFixed(1)}%`],
      ['Average DoD', `${(result.avgDoD * 100).toFixed(1)}%`],
      ['Cycles per Day', result.cyclesPerDay.toFixed(2)],
      ['Battery Life', `${costs.batteryLifeYears.toFixed(1)} years`],
    ];
    
    if (project.pv) {
      performanceData.push(['Daily Solar Production', `${(result.solarGeneratedWh / 1000).toFixed(2)} kWh`]);
      performanceData.push(['Solar Self-Consumption', `${(result.solarUsedWh / 1000).toFixed(2)} kWh`]);
    }
    
    autoTable(doc, {
      head: [performanceData[0]],
      body: performanceData.slice(1),
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [255, 77, 28] },
      styles: { fontSize: 9 },
    });
    
    // Cost Analysis
    yPos = (doc as any).lastAutoTable.finalY + 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cost Analysis', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const costData = [
      ['Item', 'Amount'],
      ['System Cost', `৳${costs.systemCost.toLocaleString()}`],
      ['Monthly Bill (No Solar)', `৳${costs.monthlyBillNoSolar.toFixed(0)}`],
      ['Monthly Bill (With Solar)', `৳${costs.monthlyBillWithSolar.toFixed(0)}`],
      ['Monthly Savings', `৳${costs.monthlySavings.toFixed(0)}`],
      ['Annual Savings', `৳${costs.annualSavings.toFixed(0)}`],
      ['Simple Payback', costs.simplePaybackYears ? `${costs.simplePaybackYears.toFixed(1)} years` : 'N/A'],
      ['Cost per kWh Delivered', `৳${costs.costPerKwhDelivered.toFixed(2)}`],
    ];
    
    autoTable(doc, {
      head: [costData[0]],
      body: costData.slice(1),
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [255, 77, 28] },
      styles: { fontSize: 9 },
    });
    
    // Load Schedule
    yPos = (doc as any).lastAutoTable.finalY + 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Load Schedule', 20, yPos);
    yPos += 8;
    
    const loadData = [
      ['Load', 'Qty', 'Watts', 'Priority', 'Usage Profile'],
      ...project.loads.map(l => [
        l.label,
        `${l.qty}`,
        `${l.watts}W`,
        l.priority === 1 ? 'Critical' : l.priority === 2 ? 'Important' : 'Sheddable',
        l.usageProfile === 'day' ? 'Daytime' : l.usageProfile === 'night' ? 'Nighttime' : l.usageProfile === 'both' ? 'All Day' : 'Occasional',
      ]),
    ];
    
    autoTable(doc, {
      head: [loadData[0]],
      body: loadData.slice(1),
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [255, 77, 28] },
      styles: { fontSize: 9 },
    });
    
    // Warnings & Recommendations
    yPos = (doc as any).lastAutoTable.finalY + 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    if (result.warnings.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Warnings & Recommendations', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      result.warnings.forEach((warning, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const icon = warning.severity === 'critical' ? '⚠' : warning.severity === 'warn' ? '⚡' : 'ℹ';
        doc.text(`${icon} ${warning.message}`, 20, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'italic');
        doc.text(`   Recommendation: ${warning.suggestedFix}`, 20, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
      });
    }
    
    // Notes
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    if (notes) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Additional Notes', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(notes, pageWidth - 40);
      doc.text(splitNotes, 20, yPos);
      yPos += splitNotes.length * 5;
    }
    
    // Terms & Conditions
    yPos += 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', 20, yPos);
    yPos += 6;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const terms = [
      '1. This proposal is valid for ' + validDays + ' days from the date of issue.',
      '2. All prices are in BDT (Bangladeshi Taka) and inclusive of VAT.',
      '3. Installation will be completed within 7-10 working days after order confirmation.',
      '4. Warranty: Inverter 2 years, Battery as per manufacturer (3-10 years), Solar panels 25 years.',
      '5. Payment terms: 50% advance, 50% on completion.',
      '6. All equipment will be brand new with original manufacturer warranty.',
      '7. Performance estimates are based on typical usage patterns and may vary.',
      '8. Maintenance service available upon request (additional cost).',
    ];
    
    terms.forEach(term => {
      doc.text(term, 20, yPos);
      yPos += 4;
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `${companyName} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save PDF
    doc.save(`${projectName.replace(/\s+/g, '_')}_${clientName || 'Proposal'}.pdf`);
  };

  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5" style={{ color: 'var(--accent)' }} />
        <h2 className="font-semibold text-lg">Generate Professional Proposal</h2>
      </div>

      <div className="space-y-4">
        {/* Company Details */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company Name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="input"
            placeholder="Your Company Name"
          />
        </div>

        {/* Client Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <User className="w-4 h-4" />
              Client Name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="input"
              placeholder="Client name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              className="input"
              placeholder="client@email.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              className="input"
              placeholder="+880..."
            />
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="input"
              placeholder="IPS/Solar System Proposal"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Validity (Days)</label>
            <input
              type="number"
              value={validDays}
              onChange={e => setValidDays(+e.target.value)}
              className="input"
              min={1}
              max={365}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium mb-2 block">Additional Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input"
            rows={3}
            placeholder="Any additional information for the client..."
          />
        </div>

        {/* Preview Summary */}
        <div className="p-4 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
          <h3 className="font-medium mb-2">Proposal Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span style={{ color: 'var(--muted)' }}>Total Load:</span>{' '}
              <span className="num font-medium">{project.loads.reduce((sum, l) => sum + l.qty * l.watts, 0)}W</span>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Runtime:</span>{' '}
              <span className="num font-medium">{result.continuousRuntime.toFixed(1)}h</span>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>System Cost:</span>{' '}
              <span className="num font-medium">৳{costs.systemCost.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Monthly Savings:</span>{' '}
              <span className="num font-medium">৳{costs.monthlySavings.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={generatePDF}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download PDF Proposal
        </button>
      </div>
    </div>
  );
}
