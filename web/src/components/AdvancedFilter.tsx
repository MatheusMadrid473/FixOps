import { useState } from "react";
import { Filter, Plus, X } from "lucide-react";

export interface FilterOption {
  id: string;
  label: string;
  options: string[];
}

interface AdvancedFilterProps {
  fields: FilterOption[];
  activeFilters: Record<string, string>;
  onFilterChange: (filters: Record<string, string>) => void;
}

export function AdvancedFilter({ fields, activeFilters, onFilterChange }: AdvancedFilterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");

  const currentFieldOptions = fields.find(f => f.id === selectedField)?.options || [];

  function handleAddFilter() {
    if (!selectedField || !selectedValue) return;

    const newFilters = { ...activeFilters, [selectedField]: selectedValue };
    onFilterChange(newFilters);
    
    // Limpa a seleção e fecha o modal
    setSelectedField("");
    setSelectedValue("");
    setIsModalOpen(false);
  }

  return (
    <>
      {/* Botão de Toggle - Ocupa o tamanho necessário e crava 48px de altura */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center gap-2 px-6 h-12 rounded-xl font-bold text-sm transition-all border shadow-sm cursor-pointer whitespace-nowrap box-border ${
          Object.keys(activeFilters).length > 0
            ? "bg-blue-base/10 text-blue-base border-blue-base/20"
            : "bg-white text-grayscale-500 border-grayscale-200 hover:bg-grayscale-50"
        }`}
      >
        <Filter size={18} />
        Filtros Avançados
        {Object.keys(activeFilters).length > 0 && (
          <span className="bg-blue-base text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
            {Object.keys(activeFilters).length}
          </span>
        )}
      </button>

      {/* Modal Limpo e Centralizado */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50">
              <h2 className="font-bold text-grayscale-600 flex items-center gap-2">
                <Filter size={18} className="text-blue-base" /> Adicionar Filtro
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-grayscale-400 hover:text-grayscale-600 cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-grayscale-500 uppercase tracking-wider">Coluna</label>
                <select
                  value={selectedField}
                  onChange={(e) => {
                    setSelectedField(e.target.value);
                    setSelectedValue("");
                  }}
                  className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-grayscale-50"
                >
                  <option value="">Selecione um campo...</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>{field.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-grayscale-500 uppercase tracking-wider">Valor</label>
                <select
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  disabled={!selectedField}
                  className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-grayscale-50 disabled:opacity-50"
                >
                  <option value="">Selecione o valor...</option>
                  {currentFieldOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-grayscale-50 transition-all cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddFilter}
                  disabled={!selectedField || !selectedValue}
                  className="flex-1 py-3 bg-blue-base text-white rounded-lg font-bold hover:bg-blue-dark transition-all disabled:opacity-50 cursor-pointer text-sm flex items-center justify-center gap-2 shadow-md"
                >
                  <Plus size={16} /> Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}