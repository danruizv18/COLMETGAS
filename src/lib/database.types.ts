// Auto-generated types for COLMETGAS INGENIERIA SAS database schema
// Run `npx supabase gen types typescript` to regenerate after schema changes

export type UserRole = 'admin' | 'engineer' | 'technician' | 'client'
export type AssetType = 'tank_stationary' | 'tank_transport' | 'gas_network' | 'metal_structure'
export type AssetStatus = 'active' | 'out_of_service' | 'decommissioned'
export type InspectionType = 'visual' | 'ultrasound' | 'hydrostatic' | 'full_maintenance'
export type InspectionResult = 'pass' | 'fail' | 'conditional'
export type WoType = 'maintenance' | 'installation' | 'manufacture' | 'fabrication'
export type WoStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'
export type PersonnelRole = 'welder' | 'technician' | 'engineer' | 'supervisor'
export type EquipmentStatus = 'active' | 'out_of_service' | 'under_calibration'
export type NotificationChannel = 'email' | 'sms' | 'whatsapp'
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          tax_id: string
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          tax_id: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          tax_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          customer_id: string
          name: string
          address: string | null
          city: string | null
          department: string | null
          gps_lat: number | null
          gps_lng: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          name: string
          address?: string | null
          city?: string | null
          department?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          name?: string
          address?: string | null
          city?: string | null
          department?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          id: string
          asset_type: AssetType
          serial_number: string | null
          tag: string
          customer_id: string
          location_id: string | null
          install_date: string | null
          capacity_value: number | null
          capacity_unit: string | null
          manufacturer: string | null
          manufacture_date: string | null
          status: AssetStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          asset_type: AssetType
          serial_number?: string | null
          tag: string
          customer_id: string
          location_id?: string | null
          install_date?: string | null
          capacity_value?: number | null
          capacity_unit?: string | null
          manufacturer?: string | null
          manufacture_date?: string | null
          status?: AssetStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          asset_type?: AssetType
          serial_number?: string | null
          tag?: string
          customer_id?: string
          location_id?: string | null
          install_date?: string | null
          capacity_value?: number | null
          capacity_unit?: string | null
          manufacturer?: string | null
          manufacture_date?: string | null
          status?: AssetStatus
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      asset_inspections: {
        Row: {
          id: string
          asset_id: string
          inspection_date: string
          inspection_type: InspectionType
          technician_id: string | null
          result: InspectionResult
          next_due_date: string | null
          certificate_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          inspection_date: string
          inspection_type: InspectionType
          technician_id?: string | null
          result: InspectionResult
          next_due_date?: string | null
          certificate_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          inspection_date?: string
          inspection_type?: InspectionType
          technician_id?: string | null
          result?: InspectionResult
          next_due_date?: string | null
          certificate_number?: string | null
          notes?: string | null
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      asset_documents: {
        Row: {
          id: string
          asset_id: string
          doc_type: string
          file_path: string
          uploaded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          doc_type: string
          file_path: string
          uploaded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          doc_type?: string
          file_path?: string
          uploaded_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      personnel: {
        Row: {
          id: string
          full_name: string
          role: PersonnelRole
          national_id: string
          hire_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          role: PersonnelRole
          national_id: string
          hire_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: PersonnelRole
          national_id?: string
          hire_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      personnel_certifications: {
        Row: {
          id: string
          personnel_id: string
          certification_name: string
          issuing_body: string | null
          issued_date: string | null
          expires_date: string | null
          certificate_file_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          personnel_id: string
          certification_name: string
          issuing_body?: string | null
          issued_date?: string | null
          expires_date?: string | null
          certificate_file_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          personnel_id?: string
          certification_name?: string
          issuing_body?: string | null
          issued_date?: string | null
          expires_date?: string | null
          certificate_file_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      material_categories: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: { id?: string; name: string; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; updated_at?: string }
        Relationships: []
      }
      materials: {
        Row: {
          id: string
          category_id: string
          description: string
          specification: string | null
          unit_of_measure: string
          current_stock: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          description: string
          specification?: string | null
          unit_of_measure: string
          current_stock?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          description?: string
          specification?: string | null
          unit_of_measure?: string
          current_stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      material_batches: {
        Row: {
          id: string
          material_id: string
          batch_number: string
          heat_number: string | null
          supplier: string | null
          received_date: string | null
          quantity: number
          mtr_file_path: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          material_id: string
          batch_number: string
          heat_number?: string | null
          supplier?: string | null
          received_date?: string | null
          quantity: number
          mtr_file_path?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          batch_number?: string
          heat_number?: string | null
          supplier?: string | null
          received_date?: string | null
          quantity?: number
          mtr_file_path?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      material_consumption: {
        Row: {
          id: string
          batch_id: string
          work_order_id: string | null
          quantity_used: number
          used_date: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          work_order_id?: string | null
          quantity_used: number
          used_date: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          work_order_id?: string | null
          quantity_used?: number
          used_date?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          id: string
          wo_number: string
          customer_id: string
          location_id: string | null
          asset_id: string | null
          wo_type: WoType
          status: WoStatus
          start_date: string | null
          end_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wo_number: string
          customer_id: string
          location_id?: string | null
          asset_id?: string | null
          wo_type: WoType
          status?: WoStatus
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wo_number?: string
          customer_id?: string
          location_id?: string | null
          asset_id?: string | null
          wo_type?: WoType
          status?: WoStatus
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          id: string
          name: string
          serial_number: string | null
          equipment_type: string | null
          last_calibration_date: string | null
          next_calibration_due: string | null
          status: EquipmentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          serial_number?: string | null
          equipment_type?: string | null
          last_calibration_date?: string | null
          next_calibration_due?: string | null
          status?: EquipmentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          serial_number?: string | null
          equipment_type?: string | null
          last_calibration_date?: string | null
          next_calibration_due?: string | null
          status?: EquipmentStatus
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          inspection_id: string
          customer_id: string
          recipient_email: string
          channel: NotificationChannel
          subject: string
          body: string
          status: NotificationStatus
          error_message: string | null
          sent_at: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          inspection_id: string
          customer_id: string
          recipient_email: string
          channel?: NotificationChannel
          subject: string
          body: string
          status?: NotificationStatus
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          inspection_id?: string
          customer_id?: string
          recipient_email?: string
          channel?: NotificationChannel
          subject?: string
          body?: string
          status?: NotificationStatus
          error_message?: string | null
          sent_at?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: UserRole
          customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: UserRole
          customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inspection_audit_log: {
        Row: {
          id: string
          inspection_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          changed_by: string | null
          changed_at: string
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          inspection_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          changed_by?: string | null
          changed_at?: string
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
        }
        Update: never
        Relationships: []
      }
    }
    Views: {
        v_batch_stock: {
          Row: {
            batch_id: string
            material_id: string
            received: number
            consumed: number
            available: number
          }
          Relationships: []
        }
        v_material_stock: {
          Row: {
            material_id: string
            total_stock: number
          }
          Relationships: []
        }
      }
    Functions: Record<string, never>
    Enums: {
      user_role_enum: UserRole
      asset_type_enum: AssetType
      asset_status_enum: AssetStatus
      inspection_type_enum: InspectionType
      inspection_result_enum: InspectionResult
      wo_type_enum: WoType
      wo_status_enum: WoStatus
      personnel_role_enum: PersonnelRole
      equipment_status_enum: EquipmentStatus
      notification_channel_enum: NotificationChannel
      notification_status_enum: NotificationStatus
    }
  }
}

// Convenience row-type aliases
export type Customer = Database['public']['Tables']['customers']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type Asset = Database['public']['Tables']['assets']['Row']
export type AssetInspection = Database['public']['Tables']['asset_inspections']['Row']
export type AssetDocument = Database['public']['Tables']['asset_documents']['Row']
export type Personnel = Database['public']['Tables']['personnel']['Row']
export type PersonnelCertification = Database['public']['Tables']['personnel_certifications']['Row']
export type MaterialCategory = Database['public']['Tables']['material_categories']['Row']
export type Material = Database['public']['Tables']['materials']['Row']
export type MaterialBatch = Database['public']['Tables']['material_batches']['Row']
export type MaterialConsumption = Database['public']['Tables']['material_consumption']['Row']
export type WorkOrder = Database['public']['Tables']['work_orders']['Row']
export type Equipment = Database['public']['Tables']['equipment']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type InspectionAuditLog = Database['public']['Tables']['inspection_audit_log']['Row']
export type BatchStock = Database['public']['Views']['v_batch_stock']['Row']
export type MaterialStock = Database['public']['Views']['v_material_stock']['Row']
