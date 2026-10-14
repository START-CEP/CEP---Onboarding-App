export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      action_tokens: {
        Row: {
          created_at: string
          enrollment_id: string | null
          expires_at: string
          id: string
          payload: Json
          profile_id: string | null
          purpose: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          expires_at: string
          id?: string
          payload?: Json
          profile_id?: string | null
          purpose: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          expires_at?: string
          id?: string
          payload?: Json
          profile_id?: string | null
          purpose?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_tokens_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_tokens_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "action_tokens_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "action_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_progress: {
        Row: {
          completed_at: string | null
          enrollment_activity_id: string
          id: string
          profile_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          updated_by: string | null
          video_seconds: number
        }
        Insert: {
          completed_at?: string | null
          enrollment_activity_id: string
          id?: string
          profile_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          updated_by?: string | null
          video_seconds?: number
        }
        Update: {
          completed_at?: string | null
          enrollment_activity_id?: string
          id?: string
          profile_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          updated_by?: string | null
          video_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_progress_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_progress_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "activity_progress_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "activity_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_progress_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      care_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      client_unit_members: {
        Row: {
          member_index: number
          profile_id: string
          unit_id: string
        }
        Insert: {
          member_index: number
          profile_id: string
          unit_id: string
        }
        Update: {
          member_index?: number
          profile_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_unit_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
            referencedColumns: ["id"]
          },
        ]
      }
      client_units: {
        Row: {
          archived_at: string | null
          created_at: string
          display_name: string
          id: string
          kind: Database["public"]["Enums"]["unit_kind"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_name: string
          id?: string
          kind: Database["public"]["Enums"]["unit_kind"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["unit_kind"]
        }
        Relationships: []
      }
      content_assets: {
        Row: {
          archived_at: string | null
          checksum_sha256: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime: string | null
          processing_status: string
          provider: string | null
          provider_id: string | null
          provider_library_id: string | null
          provider_meta: Json
          replaced_by: string | null
          size_bytes: number | null
          storage_bucket: string | null
          storage_path: string | null
          title: string
        }
        Insert: {
          archived_at?: string | null
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime?: string | null
          processing_status?: string
          provider?: string | null
          provider_id?: string | null
          provider_library_id?: string | null
          provider_meta?: Json
          replaced_by?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          title: string
        }
        Update: {
          archived_at?: string | null
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime?: string | null
          processing_status?: string
          provider?: string | null
          provider_id?: string | null
          provider_library_id?: string | null
          provider_meta?: Json
          replaced_by?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          contract_template_id: string
          enrollment_id: string
          id: string
          ip: unknown
          profile_id: string
          provider: string
          provider_ref: string | null
          signed_at: string
          signed_file_id: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          contract_template_id: string
          enrollment_id: string
          id?: string
          ip?: unknown
          profile_id: string
          provider?: string
          provider_ref?: string | null
          signed_at?: string
          signed_file_id?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          contract_template_id?: string
          enrollment_id?: string
          id?: string
          ip?: unknown
          profile_id?: string
          provider?: string
          provider_ref?: string | null
          signed_at?: string
          signed_file_id?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "contract_signatures_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "contract_signatures_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_signed_file_id_fkey"
            columns: ["signed_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_md: string | null
          created_at: string
          id: string
          pdf_asset_id: string | null
          published_at: string | null
          service_id: string
          summary_points: Json
          title: string
          version: number
        }
        Insert: {
          body_md?: string | null
          created_at?: string
          id?: string
          pdf_asset_id?: string | null
          published_at?: string | null
          service_id: string
          summary_points?: Json
          title: string
          version: number
        }
        Update: {
          body_md?: string | null
          created_at?: string
          id?: string
          pdf_asset_id?: string | null
          published_at?: string | null
          service_id?: string
          summary_points?: Json
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_pdf_asset_id_fkey"
            columns: ["pdf_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["service_id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          enrollment_id: string
          folder: Database["public"]["Enums"]["document_folder"]
          id: string
          mime: string | null
          profile_id: string | null
          size_bytes: number | null
          storage_path: string
          title: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enrollment_id: string
          folder: Database["public"]["Enums"]["document_folder"]
          id?: string
          mime?: string | null
          profile_id?: string | null
          size_bytes?: number | null
          storage_path: string
          title: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enrollment_id?: string
          folder?: Database["public"]["Enums"]["document_folder"]
          id?: string
          mime?: string | null
          profile_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "documents_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_activities: {
        Row: {
          added_by_staff: string | null
          asset_id: string | null
          config: Json
          contract_template_id: string | null
          enrollment_id: string
          estimated_minutes: number | null
          form_version_id: string | null
          hidden: boolean
          id: string
          key: string
          participants: Database["public"]["Enums"]["participants"]
          position: number
          response_scope: Database["public"]["Enums"]["response_scope"]
          responsible_role_id: string | null
          source_activity_id: string | null
          suggested_gap_days: number | null
          suggested_on: string | null
          summary: string | null
          title: string
          track_key: string | null
          track_name: string | null
          track_position: number | null
          type: Database["public"]["Enums"]["activity_type"]
          unlocked_at: string | null
        }
        Insert: {
          added_by_staff?: string | null
          asset_id?: string | null
          config?: Json
          contract_template_id?: string | null
          enrollment_id: string
          estimated_minutes?: number | null
          form_version_id?: string | null
          hidden?: boolean
          id?: string
          key: string
          participants: Database["public"]["Enums"]["participants"]
          position?: number
          response_scope: Database["public"]["Enums"]["response_scope"]
          responsible_role_id?: string | null
          source_activity_id?: string | null
          suggested_gap_days?: number | null
          suggested_on?: string | null
          summary?: string | null
          title: string
          track_key?: string | null
          track_name?: string | null
          track_position?: number | null
          type: Database["public"]["Enums"]["activity_type"]
          unlocked_at?: string | null
        }
        Update: {
          added_by_staff?: string | null
          asset_id?: string | null
          config?: Json
          contract_template_id?: string | null
          enrollment_id?: string
          estimated_minutes?: number | null
          form_version_id?: string | null
          hidden?: boolean
          id?: string
          key?: string
          participants?: Database["public"]["Enums"]["participants"]
          position?: number
          response_scope?: Database["public"]["Enums"]["response_scope"]
          responsible_role_id?: string | null
          source_activity_id?: string | null
          suggested_gap_days?: number | null
          suggested_on?: string | null
          summary?: string | null
          title?: string
          track_key?: string | null
          track_name?: string | null
          track_position?: number | null
          type?: Database["public"]["Enums"]["activity_type"]
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_activities_added_by_staff_fkey"
            columns: ["added_by_staff"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_activities_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_responsible_role_id_fkey"
            columns: ["responsible_role_id"]
            isOneToOne: false
            referencedRelation: "care_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_source_activity_id_fkey"
            columns: ["source_activity_id"]
            isOneToOne: false
            referencedRelation: "service_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_requirements: {
        Row: {
          criterion: Database["public"]["Enums"]["req_criterion"]
          enforcement: Database["public"]["Enums"]["enforcement"]
          enrollment_id: string
          id: string
          is_mandatory: boolean
          label: string | null
          required_activity_id: string
          source_requirement_id: string | null
          target_activity_id: string | null
          target_step_id: string | null
          waived_at: string | null
          waived_by: string | null
        }
        Insert: {
          criterion: Database["public"]["Enums"]["req_criterion"]
          enforcement?: Database["public"]["Enums"]["enforcement"]
          enrollment_id: string
          id?: string
          is_mandatory?: boolean
          label?: string | null
          required_activity_id: string
          source_requirement_id?: string | null
          target_activity_id?: string | null
          target_step_id?: string | null
          waived_at?: string | null
          waived_by?: string | null
        }
        Update: {
          criterion?: Database["public"]["Enums"]["req_criterion"]
          enforcement?: Database["public"]["Enums"]["enforcement"]
          enrollment_id?: string
          id?: string
          is_mandatory?: boolean
          label?: string | null
          required_activity_id?: string
          source_requirement_id?: string | null
          target_activity_id?: string | null
          target_step_id?: string | null
          waived_at?: string | null
          waived_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_requirements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_required_activity_id_fkey"
            columns: ["required_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_required_activity_id_fkey"
            columns: ["required_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_required_activity_id_fkey"
            columns: ["required_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_source_requirement_id_fkey"
            columns: ["source_requirement_id"]
            isOneToOne: false
            referencedRelation: "service_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_activity_id_fkey"
            columns: ["target_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_activity_id_fkey"
            columns: ["target_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_activity_id_fkey"
            columns: ["target_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "enrollment_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "v_step_state"
            referencedColumns: ["step_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_waived_by_fkey"
            columns: ["waived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_sessions: {
        Row: {
          booking_provider: string | null
          booking_ref: string | null
          created_at: string
          duration_min: number
          enrollment_activity_id: string
          enrollment_id: string
          id: string
          meeting_url: string | null
          scheduled_at: string | null
          staff_profile_id: string | null
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          booking_provider?: string | null
          booking_ref?: string | null
          created_at?: string
          duration_min?: number
          enrollment_activity_id: string
          enrollment_id: string
          id?: string
          meeting_url?: string | null
          scheduled_at?: string | null
          staff_profile_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          booking_provider?: string | null
          booking_ref?: string | null
          created_at?: string
          duration_min?: number
          enrollment_activity_id?: string
          enrollment_id?: string
          id?: string
          meeting_url?: string | null
          scheduled_at?: string | null
          staff_profile_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_sessions_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_sessions_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "enrollment_sessions_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "enrollment_sessions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_sessions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_sessions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_sessions_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_staff: {
        Row: {
          care_role_id: string
          enrollment_id: string
          staff_profile_id: string
        }
        Insert: {
          care_role_id: string
          enrollment_id: string
          staff_profile_id: string
        }
        Update: {
          care_role_id?: string
          enrollment_id?: string
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_staff_care_role_id_fkey"
            columns: ["care_role_id"]
            isOneToOne: false
            referencedRelation: "care_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_staff_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_staff_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_staff_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_staff_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_steps: {
        Row: {
          activity_id: string
          block_name: string | null
          block_position: number | null
          completed_at: string | null
          completed_by: string | null
          description: string | null
          enrollment_id: string
          entered_at: string | null
          hidden: boolean
          id: string
          position: number
          source_step_id: string | null
          title: string
        }
        Insert: {
          activity_id: string
          block_name?: string | null
          block_position?: number | null
          completed_at?: string | null
          completed_by?: string | null
          description?: string | null
          enrollment_id: string
          entered_at?: string | null
          hidden?: boolean
          id?: string
          position: number
          source_step_id?: string | null
          title: string
        }
        Update: {
          activity_id?: string
          block_name?: string | null
          block_position?: number | null
          completed_at?: string | null
          completed_by?: string | null
          description?: string | null
          enrollment_id?: string
          entered_at?: string | null
          hidden?: boolean
          id?: string
          position?: number
          source_step_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "enrollment_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "enrollment_steps_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_steps_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_steps_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_steps_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_steps_source_step_id_fkey"
            columns: ["source_step_id"]
            isOneToOne: false
            referencedRelation: "service_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          access_until: string | null
          created_at: string
          id: string
          service_version_id: string
          sold_by: string | null
          starts_on: string
          status: Database["public"]["Enums"]["enrollment_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          access_until?: string | null
          created_at?: string
          id?: string
          service_version_id: string
          sold_by?: string | null
          starts_on: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          access_until?: string | null
          created_at?: string
          id?: string
          service_version_id?: string
          sold_by?: string | null
          starts_on?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_service_version_id_fkey"
            columns: ["service_version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          checksum_sha256: string | null
          created_at: string
          deleted_at: string | null
          id: string
          mime: string | null
          path: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          mime?: string | null
          path: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          checksum_sha256?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          mime?: string | null
          path?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          answers: Json
          created_at: string
          enrollment_activity_id: string
          enrollment_id: string
          form_version_id: string | null
          id: string
          response_scope: Database["public"]["Enums"]["response_scope"]
          revision_of: string | null
          score: number | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          enrollment_activity_id: string
          enrollment_id: string
          form_version_id?: string | null
          id?: string
          response_scope: Database["public"]["Enums"]["response_scope"]
          revision_of?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          enrollment_activity_id?: string
          enrollment_id?: string
          form_version_id?: string | null
          id?: string
          response_scope?: Database["public"]["Enums"]["response_scope"]
          revision_of?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "form_submissions_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "form_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "form_submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "form_submissions_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_revision_of_fkey"
            columns: ["revision_of"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_versions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          published_at: string | null
          schema: Json
          version: number
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          published_at?: string | null
          schema: Json
          version: number
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          published_at?: string | null
          schema?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          key: string
          kind: string
          name: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          key: string
          kind: string
          name: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          key?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      group_programs: {
        Row: {
          archived_at: string | null
          cadence_days: number
          created_at: string
          default_time: string
          id: string
          key: string
          name: string
          timezone: string
        }
        Insert: {
          archived_at?: string | null
          cadence_days?: number
          created_at?: string
          default_time?: string
          id?: string
          key: string
          name: string
          timezone?: string
        }
        Update: {
          archived_at?: string | null
          cadence_days?: number
          created_at?: string
          default_time?: string
          id?: string
          key?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      group_session_attendance: {
        Row: {
          attended: boolean
          group_session_id: string
          profile_id: string
        }
        Insert: {
          attended?: boolean
          group_session_id: string
          profile_id: string
        }
        Update: {
          attended?: boolean
          group_session_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_session_attendance_group_session_id_fkey"
            columns: ["group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_session_attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_session_questions: {
        Row: {
          body: string
          created_at: string
          enrollment_id: string | null
          group_session_id: string
          id: string
          is_anonymous: boolean
          profile_id: string
          status: string
        }
        Insert: {
          body: string
          created_at?: string
          enrollment_id?: string | null
          group_session_id: string
          id?: string
          is_anonymous?: boolean
          profile_id: string
          status?: string
        }
        Update: {
          body?: string
          created_at?: string
          enrollment_id?: string | null
          group_session_id?: string
          id?: string
          is_anonymous?: boolean
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_session_questions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_session_questions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "group_session_questions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "group_session_questions_group_session_id_fkey"
            columns: ["group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_session_questions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          created_at: string
          id: string
          meeting_url: string | null
          program_id: string
          recording_asset_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["session_status"]
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_url?: string | null
          program_id: string
          recording_asset_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          meeting_url?: string | null
          program_id?: string
          recording_asset_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "group_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "group_sessions_recording_asset_id_fkey"
            columns: ["recording_asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          enrollment_id: string | null
          id: string
          link: string | null
          profile_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          enrollment_id?: string | null
          id?: string
          link?: string | null
          profile_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          enrollment_id?: string | null
          id?: string
          link?: string | null
          profile_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "notifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_messages: {
        Row: {
          channel: string
          created_at: string
          enrollment_id: string | null
          error: string | null
          id: string
          payload: Json
          profile_id: string | null
          sent_at: string | null
          status: string
          template_key: string
          to_address: string
        }
        Insert: {
          channel: string
          created_at?: string
          enrollment_id?: string | null
          error?: string | null
          id?: string
          payload?: Json
          profile_id?: string | null
          sent_at?: string | null
          status?: string
          template_key: string
          to_address: string
        }
        Update: {
          channel?: string
          created_at?: string
          enrollment_id?: string | null
          error?: string | null
          id?: string
          payload?: Json
          profile_id?: string | null
          sent_at?: string | null
          status?: string
          template_key?: string
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "outbound_messages_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "outbound_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_session_reports: {
        Row: {
          content: Json
          enrollment_activity_id: string
          enrollment_id: string
          generated_at: string
          generated_by: string | null
          id: string
        }
        Insert: {
          content: Json
          enrollment_activity_id: string
          enrollment_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
        }
        Update: {
          content?: Json
          enrollment_activity_id?: string
          enrollment_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_session_reports_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_session_reports_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "pre_session_reports_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "pre_session_reports_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_session_reports_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "pre_session_reports_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "pre_session_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          prefs: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          prefs?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          prefs?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_downloads: {
        Row: {
          downloaded_at: string
          id: string
          profile_id: string
          resource_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          profile_id: string
          resource_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          profile_id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_downloads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_downloads_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          archived_at: string | null
          asset_id: string
          attach_id: string
          attach_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          position: number
          title: string
          visible_from: string | null
        }
        Insert: {
          archived_at?: string | null
          asset_id: string
          attach_id: string
          attach_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          position?: number
          title: string
          visible_from?: string | null
        }
        Update: {
          archived_at?: string | null
          asset_id?: string
          attach_id?: string
          attach_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          position?: number
          title?: string
          visible_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_activities: {
        Row: {
          asset_id: string | null
          config: Json
          contract_template_id: string | null
          estimated_minutes: number | null
          form_version_id: string | null
          id: string
          key: string
          participants: Database["public"]["Enums"]["participants"]
          position: number
          response_scope: Database["public"]["Enums"]["response_scope"]
          responsible_role_id: string | null
          suggested_gap_days: number | null
          suggested_offset_days: number | null
          summary: string | null
          title: string
          track_id: string | null
          type: Database["public"]["Enums"]["activity_type"]
          version_id: string
        }
        Insert: {
          asset_id?: string | null
          config?: Json
          contract_template_id?: string | null
          estimated_minutes?: number | null
          form_version_id?: string | null
          id?: string
          key: string
          participants?: Database["public"]["Enums"]["participants"]
          position?: number
          response_scope?: Database["public"]["Enums"]["response_scope"]
          responsible_role_id?: string | null
          suggested_gap_days?: number | null
          suggested_offset_days?: number | null
          summary?: string | null
          title: string
          track_id?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          version_id: string
        }
        Update: {
          asset_id?: string | null
          config?: Json
          contract_template_id?: string | null
          estimated_minutes?: number | null
          form_version_id?: string | null
          id?: string
          key?: string
          participants?: Database["public"]["Enums"]["participants"]
          position?: number
          response_scope?: Database["public"]["Enums"]["response_scope"]
          responsible_role_id?: string | null
          suggested_gap_days?: number | null
          suggested_offset_days?: number | null
          summary?: string | null
          title?: string
          track_id?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_activities_asset_fk"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "content_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_activities_contract_fk"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_activities_form_fk"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_activities_responsible_role_id_fkey"
            columns: ["responsible_role_id"]
            isOneToOne: false
            referencedRelation: "care_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_activities_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "service_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_activities_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_blocks: {
        Row: {
          color: string | null
          id: string
          name: string
          position: number
          version_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          position: number
          version_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          position?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_blocks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_followups: {
        Row: {
          id: string
          label: string
          next_service_id: string
          version_id: string
        }
        Insert: {
          id?: string
          label: string
          next_service_id: string
          version_id: string
        }
        Update: {
          id?: string
          label?: string
          next_service_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_followups_next_service_id_fkey"
            columns: ["next_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_followups_next_service_id_fkey"
            columns: ["next_service_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "service_followups_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_group_programs: {
        Row: {
          group_program_id: string
          service_id: string
        }
        Insert: {
          group_program_id: string
          service_id: string
        }
        Update: {
          group_program_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_group_programs_group_program_id_fkey"
            columns: ["group_program_id"]
            isOneToOne: false
            referencedRelation: "group_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_group_programs_group_program_id_fkey"
            columns: ["group_program_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "service_group_programs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_group_programs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["service_id"]
          },
        ]
      }
      service_reminder_rules: {
        Row: {
          activity_id: string | null
          channel: string
          id: string
          offset_hours: number
          template_key: string
          trigger: string
          version_id: string
        }
        Insert: {
          activity_id?: string | null
          channel?: string
          id?: string
          offset_hours?: number
          template_key: string
          trigger: string
          version_id: string
        }
        Update: {
          activity_id?: string | null
          channel?: string
          id?: string
          offset_hours?: number
          template_key?: string
          trigger?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reminder_rules_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "service_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reminder_rules_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requirements: {
        Row: {
          criterion: Database["public"]["Enums"]["req_criterion"]
          enforcement: Database["public"]["Enums"]["enforcement"]
          id: string
          is_mandatory: boolean
          label: string | null
          required_activity_id: string
          target_activity_id: string | null
          target_step_id: string | null
          version_id: string
        }
        Insert: {
          criterion: Database["public"]["Enums"]["req_criterion"]
          enforcement?: Database["public"]["Enums"]["enforcement"]
          id?: string
          is_mandatory?: boolean
          label?: string | null
          required_activity_id: string
          target_activity_id?: string | null
          target_step_id?: string | null
          version_id: string
        }
        Update: {
          criterion?: Database["public"]["Enums"]["req_criterion"]
          enforcement?: Database["public"]["Enums"]["enforcement"]
          id?: string
          is_mandatory?: boolean
          label?: string | null
          required_activity_id?: string
          target_activity_id?: string | null
          target_step_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requirements_required_activity_id_fkey"
            columns: ["required_activity_id"]
            isOneToOne: false
            referencedRelation: "service_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requirements_target_activity_id_fkey"
            columns: ["target_activity_id"]
            isOneToOne: false
            referencedRelation: "service_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requirements_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "service_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requirements_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_steps: {
        Row: {
          activity_id: string
          block_id: string | null
          description: string | null
          id: string
          position: number
          title: string
          version_id: string
        }
        Insert: {
          activity_id: string
          block_id?: string | null
          description?: string | null
          id?: string
          position: number
          title: string
          version_id: string
        }
        Update: {
          activity_id?: string
          block_id?: string | null
          description?: string | null
          id?: string
          position?: number
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "service_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_steps_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "service_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_steps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tracks: {
        Row: {
          color: string | null
          id: string
          key: string
          name: string
          position: number
          version_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          key: string
          name: string
          position: number
          version_id: string
        }
        Update: {
          color?: string | null
          id?: string
          key?: string
          name?: string
          position?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_tracks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_versions: {
        Row: {
          access_days: number | null
          cloned_from: string | null
          created_at: string
          expected_duration_days: number | null
          id: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          service_id: string
          status: Database["public"]["Enums"]["version_status"]
          version: number
          welcome_activity_id: string | null
        }
        Insert: {
          access_days?: number | null
          cloned_from?: string | null
          created_at?: string
          expected_duration_days?: number | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["version_status"]
          version: number
          welcome_activity_id?: string | null
        }
        Update: {
          access_days?: number | null
          cloned_from?: string | null
          created_at?: string
          expected_duration_days?: number | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["version_status"]
          version?: number
          welcome_activity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_versions_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "service_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_versions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "service_versions_welcome_fk"
            columns: ["welcome_activity_id"]
            isOneToOne: false
            referencedRelation: "service_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived_at: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          price_cents: number
          slug: string
          status: Database["public"]["Enums"]["service_status"]
          unit_kind: Database["public"]["Enums"]["unit_kind"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_cents?: number
          slug: string
          status?: Database["public"]["Enums"]["service_status"]
          unit_kind: Database["public"]["Enums"]["unit_kind"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          slug?: string
          status?: Database["public"]["Enums"]["service_status"]
          unit_kind?: Database["public"]["Enums"]["unit_kind"]
        }
        Relationships: []
      }
      session_agenda_items: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          enrollment_activity_id: string
          id: string
          position: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          enrollment_activity_id: string
          id?: string
          position?: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          enrollment_activity_id?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_agenda_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_agenda_items_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_agenda_items_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "session_agenda_items_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
        ]
      }
      session_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          enrollment_session_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          enrollment_session_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          enrollment_session_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_enrollment_session_id_fkey"
            columns: ["enrollment_session_id"]
            isOneToOne: false
            referencedRelation: "enrollment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_form_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          sent_to: string
          submission_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          sent_to: string
          submission_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          sent_to?: string
          submission_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_form_invites_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          bio: string | null
          created_at: string
          is_active: boolean
          profile_id: string
          title: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          is_active?: boolean
          profile_id: string
          title: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          is_active?: boolean
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          profile_id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_task_progress: {
        Row: {
          done_at: string | null
          done_by: string | null
          due_on: string | null
          enrollment_activity_id: string
          id: string
          item_key: string
        }
        Insert: {
          done_at?: string | null
          done_by?: string | null
          due_on?: string | null
          enrollment_activity_id: string
          id?: string
          item_key: string
        }
        Update: {
          done_at?: string | null
          done_by?: string | null
          due_on?: string | null
          enrollment_activity_id?: string
          id?: string
          item_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_task_progress_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_task_progress_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_task_progress_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "staff_task_progress_enrollment_activity_id_fkey"
            columns: ["enrollment_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
        ]
      }
      staff_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          dedupe_key: string | null
          description: string | null
          done_at: string | null
          due_on: string | null
          enrollment_id: string | null
          id: string
          source: string
          status: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          description?: string | null
          done_at?: string | null
          due_on?: string | null
          enrollment_id?: string | null
          id?: string
          source?: string
          status?: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          description?: string | null
          done_at?: string | null
          due_on?: string | null
          enrollment_id?: string | null
          id?: string
          source?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "staff_tasks_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
        ]
      }
      submission_files: {
        Row: {
          file_id: string
          submission_id: string
        }
        Insert: {
          file_id: string
          submission_id: string
        }
        Update: {
          file_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_participants: {
        Row: {
          confirmed_at: string | null
          profile_id: string
          submission_id: string
        }
        Insert: {
          confirmed_at?: string | null
          profile_id: string
          submission_id: string
        }
        Update: {
          confirmed_at?: string | null
          profile_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_participants_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          is_private: boolean
          opened_by: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          is_private?: boolean
          opened_by?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          is_private?: boolean
          opened_by?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "support_tickets_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "support_tickets_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_activity_state: {
        Row: {
          activity_id: string | null
          blocking_unmet: number | null
          enrollment_id: string | null
          estimated_minutes: number | null
          is_completed: boolean | null
          key: string | null
          participants: Database["public"]["Enums"]["participants"] | null
          position: number | null
          response_scope: Database["public"]["Enums"]["response_scope"] | null
          responsible_role_id: string | null
          responsible_staff_id: string | null
          suggested_on: string | null
          task_pending: boolean | null
          title: string | null
          track_key: string | null
          track_name: string | null
          track_position: number | null
          type: Database["public"]["Enums"]["activity_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_activities_responsible_role_id_fkey"
            columns: ["responsible_role_id"]
            isOneToOne: false
            referencedRelation: "care_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_staff_staff_profile_id_fkey"
            columns: ["responsible_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_enrollment_state: {
        Row: {
          access_until: string | null
          current_block: string | null
          current_step_blocking_unmet: number | null
          current_step_position: number | null
          current_step_title: string | null
          days_elapsed: number | null
          days_left: number | null
          enrollment_id: string | null
          service_id: string | null
          service_name: string | null
          service_version: number | null
          starts_on: string | null
          status: Database["public"]["Enums"]["enrollment_status"] | null
          steps_completed: number | null
          steps_total: number | null
          unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "client_units"
            referencedColumns: ["id"]
          },
        ]
      }
      v_group_progress: {
        Row: {
          enrollment_id: string | null
          next_session_at: string | null
          program_id: string | null
          program_name: string | null
          sessions_attended: number | null
          sessions_held: number | null
          sessions_total: number | null
        }
        Relationships: []
      }
      v_requirement_status: {
        Row: {
          criterion: Database["public"]["Enums"]["req_criterion"] | null
          enforcement: Database["public"]["Enums"]["enforcement"] | null
          enrollment_id: string | null
          id: string | null
          is_mandatory: boolean | null
          is_met: boolean | null
          label: string | null
          required_activity_id: string | null
          required_key: string | null
          required_title: string | null
          required_type: Database["public"]["Enums"]["activity_type"] | null
          target_activity_id: string | null
          target_step_id: string | null
          target_step_position: number | null
          waived: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_requirements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_activity_id_fkey"
            columns: ["target_activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_activity_id_fkey"
            columns: ["target_activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_activity_id_fkey"
            columns: ["target_activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "enrollment_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_requirements_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "v_step_state"
            referencedColumns: ["step_id"]
          },
        ]
      }
      v_step_state: {
        Row: {
          activity_id: string | null
          activity_key: string | null
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          block_name: string | null
          block_position: number | null
          blocking_unmet: number | null
          description: string | null
          enrollment_id: string | null
          is_completed: boolean | null
          participants: Database["public"]["Enums"]["participants"] | null
          position: number | null
          requirements_met: number | null
          requirements_total: number | null
          responsible_role_id: string | null
          state: string | null
          step_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_activities_responsible_role_id_fkey"
            columns: ["responsible_role_id"]
            isOneToOne: false
            referencedRelation: "care_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "enrollment_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_activity_state"
            referencedColumns: ["activity_id"]
          },
          {
            foreignKeyName: "enrollment_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "v_requirement_status"
            referencedColumns: ["required_activity_id"]
          },
          {
            foreignKeyName: "enrollment_steps_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_steps_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_steps_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
        ]
      }
      v_track_progress: {
        Row: {
          activities_completed: number | null
          activities_total: number | null
          enrollment_id: string | null
          tasks_pending: number | null
          track_key: string | null
          track_name: string | null
          track_position: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_enrollment_state"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "enrollment_activities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_group_progress"
            referencedColumns: ["enrollment_id"]
          },
        ]
      }
    }
    Functions: {
      clone_service_version: {
        Args: { p_target_service?: string; p_version: string }
        Returns: string
      }
      enroll_unit: {
        Args: {
          p_staff?: Json
          p_starts_on: string
          p_status?: Database["public"]["Enums"]["enrollment_status"]
          p_unit_id: string
          p_version_id: string
        }
        Returns: string
      }
      find_auth_user: {
        Args: { p_email: string }
        Returns: {
          email_confirmed: boolean
          id: string
        }[]
      }
      generate_followups: { Args: never; Returns: number }
      publish_service_version: {
        Args: { p_version: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_type:
        | "video_module"
        | "reading"
        | "form"
        | "homework"
        | "contract"
        | "therapy_session"
        | "group_session"
        | "staff_task"
        | "external_link"
        | "checklist"
      asset_kind: "video" | "pdf" | "audio" | "image" | "other"
      document_folder: "legal" | "process" | "reports" | "resources"
      enforcement: "blocks" | "reminds"
      enrollment_status:
        | "invited"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      participants: "all" | "member_1" | "member_2" | "each_member"
      progress_status:
        | "locked"
        | "available"
        | "in_progress"
        | "submitted"
        | "completed"
        | "skipped"
      req_criterion:
        | "viewed"
        | "task_submitted"
        | "form_submitted"
        | "signed"
        | "attended"
        | "completed"
        | "staff_confirmed"
      response_scope: "individual" | "shared"
      service_status: "active" | "inactive"
      session_status:
        | "requested"
        | "scheduled"
        | "completed"
        | "cancelled"
        | "no_show"
      staff_role: "admin" | "clinician" | "assistant" | "sales"
      submission_status: "draft" | "submitted"
      unit_kind: "couple" | "individual" | "group"
      version_status: "draft" | "published" | "retired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "video_module",
        "reading",
        "form",
        "homework",
        "contract",
        "therapy_session",
        "group_session",
        "staff_task",
        "external_link",
        "checklist",
      ],
      asset_kind: ["video", "pdf", "audio", "image", "other"],
      document_folder: ["legal", "process", "reports", "resources"],
      enforcement: ["blocks", "reminds"],
      enrollment_status: [
        "invited",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      participants: ["all", "member_1", "member_2", "each_member"],
      progress_status: [
        "locked",
        "available",
        "in_progress",
        "submitted",
        "completed",
        "skipped",
      ],
      req_criterion: [
        "viewed",
        "task_submitted",
        "form_submitted",
        "signed",
        "attended",
        "completed",
        "staff_confirmed",
      ],
      response_scope: ["individual", "shared"],
      service_status: ["active", "inactive"],
      session_status: [
        "requested",
        "scheduled",
        "completed",
        "cancelled",
        "no_show",
      ],
      staff_role: ["admin", "clinician", "assistant", "sales"],
      submission_status: ["draft", "submitted"],
      unit_kind: ["couple", "individual", "group"],
      version_status: ["draft", "published", "retired"],
    },
  },
} as const
