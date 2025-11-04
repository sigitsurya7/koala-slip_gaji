import "jspdf";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: any;
  }
}

declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";
  export default function autoTable(doc: jsPDF, options: any): jsPDF;
}
