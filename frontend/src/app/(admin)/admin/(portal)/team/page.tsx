"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { StaffMember } from "@/super-admin/types";
import { staffService } from "@/super-admin/services";
import { AddStaffModal } from "@/super-admin/components/team/AddStaffModal";
import {
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Clock,
  CheckCircle2,
  ShieldAlert,
  UserX,
  Edit2,
} from "lucide-react";

export default function SuperAdminTeamPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchStaff = () => {
    staffService.getAll().then(setStaffList);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = staffList.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back Navigation */}
      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link
          href="/super-admin/dashboard"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Super Admin</span>
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Team & Staff</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Team & Operational Staff
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage platform root administrators, support specialists, billing operators, and role-based permissions.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between border rounded-xl bg-card p-3 shadow-xs">
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8.5 h-8.5 text-xs bg-background"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          Showing {filteredStaff.length} members
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-4 text-left">Staff Member</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Account Status</th>
                <th className="p-4 text-left">Last Active</th>
                <th className="p-4 text-left">Added</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => (
                <tr
                  key={staff.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors text-xs"
                >
                  {/* Name & Avatar */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{staff.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {staff.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5",
                        staff.role === "Super Admin" && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
                        staff.role === "Admin" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                        staff.role === "Developer" && "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
                        staff.role === "Billing Manager" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                        staff.role === "Support Agent" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                      )}
                    >
                      {staff.role}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-semibold",
                        staff.status === "Active" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                        staff.status === "Inactive" && "bg-muted text-muted-foreground",
                        staff.status === "Suspended" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      )}
                    >
                      {staff.status}
                    </Badge>
                  </td>

                  {/* Last Active */}
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>{staff.lastActive}</span>
                    </div>
                  </td>

                  {/* Added Date */}
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {staff.createdAt}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => alert(`Editing permissions for ${staff.name}`)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => alert(`Deactivating account for ${staff.name}`)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStaffAdded={(newStaff) => {
          staffService.create(newStaff).then(() => {
            fetchStaff();
            alert(`Staff member ${newStaff.name} created!`);
          });
        }}
      />
    </div>
  );
}
