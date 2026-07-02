import React, { useState, useEffect } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { useAuth } from '../auth/AuthContext'
import { api, apiRequest, API_URL } from '../api/http'

export default function Settings() {
  const { user, setUser, refreshUser } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [fullName, setFullName] = useState(user?.fullName || '')
  const [professionalLicense, setProfessionalLicense] = useState(user?.professionalLicense || '')
  const [organization, setOrganization] = useState(user?.organization || '')
  const [specialization, setSpecialization] = useState(user?.specialization || '')
  const [certifications, setCertifications] = useState(user?.certifications || '')

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setProfessionalLicense(user.professionalLicense || '')
      setOrganization(user.organization || '')
      setSpecialization(user.specialization || '')
      setCertifications(user.certifications || '')
    }
  }, [user])

  const handleFileChange = (e) => {
    setAvatarError('')
    setFormSuccess('')
    const file = e.target.files[0]
    if (!file) return

    // Validate size: 5MB
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setAvatarError('File is too large. Max size is 5MB.')
      return
    }

    // Validate extension
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setAvatarError('Unsupported file type. Only JPG, JPEG, PNG, and WEBP are supported.')
      return
    }

    setSelectedFile(file)
    setRemoveAvatar(false)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoveAvatar(true)
    setAvatarError('')
    setFormSuccess('')
  }

  const handleCancel = () => {
    setFullName(user?.fullName || '')
    setProfessionalLicense(user?.professionalLicense || '')
    setOrganization(user?.organization || '')
    setSpecialization(user?.specialization || '')
    setCertifications(user?.certifications || '')
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoveAvatar(false)
    setAvatarError('')
    setFormError('')
    setFormSuccess('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setLoading(true)

    try {
      // 1. Update profile basic details
      const profilePayload = {
        fullName: fullName.trim(),
        professionalLicense: professionalLicense.trim() || null,
        organization: organization.trim() || null,
        specialization: specialization.trim() || null,
        certifications: certifications.trim() || null
      }
      await api.put('/api/users/me', profilePayload)

      // 2. Update avatar picture
      if (removeAvatar) {
        await api.del('/api/users/me/avatar')
      } else if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        await apiRequest('/api/users/me/avatar', {
          method: 'POST',
          body: formData
        })
      }

      // 3. Refresh user session context
      const freshUser = await refreshUser()
      setUser(freshUser)
      setFormSuccess('Profile updated successfully.')
      setSelectedFile(null)
      setPreviewUrl(null)
      setRemoveAvatar(false)
    } catch (err) {
      setFormError(err.message || 'Profile update failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#124E44]/20 bg-[#123E36] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">System Preferences</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Settings</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">Manage profile context, notification preferences, and system disclaimer visibility.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Profile Details Form & Picture */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Update Profile" premium>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
                {/* Profile Picture Upload Area */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="relative group">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Avatar Preview"
                        className="h-28 w-28 rounded-xl object-cover ring-4 ring-emerald-500/20 shadow-md"
                      />
                    ) : user?.avatarUrl && !removeAvatar ? (
                      <img
                        src={`${API_URL}${user.avatarUrl}`}
                        alt={user?.fullName || 'Avatar'}
                        className="h-28 w-28 rounded-xl object-cover ring-4 ring-[#063F35]/20 shadow-md"
                      />
                    ) : (
                      <div className="grid h-28 w-28 place-items-center rounded-xl bg-emerald-500 text-2xl font-black uppercase text-[#04251f] shadow-md ring-4 ring-emerald-500/10">
                        {(fullName || user?.fullName || 'U').slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full min-w-[120px]">
                    <label className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-sm px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-200">
                      Change Photo
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                    {((user?.avatarUrl && !removeAvatar) || selectedFile) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-300/10 bg-rose-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-500/20 active:scale-[0.98] transition-all duration-200"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  {avatarError && (
                    <p className="text-[11px] font-bold text-rose-600 max-w-[150px] text-center leading-relaxed">
                      {avatarError}
                    </p>
                  )}
                </div>

                {/* Form Fields */}
                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Professional Full Name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value)
                        setFormSuccess('')
                      }}
                      required
                      placeholder="e.g. Jean Pierre"
                    />

                    <label className="block space-y-2">
                      <span className="text-[0.825rem] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 ml-1">Email Address</span>
                      <div className="bg-slate-50 dark:bg-[#081f1a] border border-slate-200/60 dark:border-emerald-950/40 text-slate-500 select-none py-3 px-4 rounded-xl text-sm font-semibold">
                        {user?.email || 'N/A'}
                      </div>
                    </label>

                    <label className="block space-y-2">
                      <span className="text-[0.825rem] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 ml-1">Account Role</span>
                      <div className="bg-slate-50 dark:bg-[#081f1a] border border-slate-200/60 dark:border-emerald-950/40 text-slate-500 select-none py-3 px-4 rounded-xl text-sm font-semibold">
                        {user?.role?.replace('_', ' ') || 'N/A'}
                      </div>
                    </label>

                    <label className="block space-y-2">
                      <span className="text-[0.825rem] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 ml-1">System Status</span>
                      <div className="bg-slate-50 dark:bg-[#081f1a] border border-slate-200/60 dark:border-emerald-950/40 text-slate-500 select-none py-3 px-4 rounded-xl text-sm font-semibold">
                        {user?.status || 'N/A'}
                      </div>
                    </label>

                    <Input
                      label="Professional License Number"
                      value={professionalLicense}
                      onChange={(e) => {
                        setProfessionalLicense(e.target.value)
                        setFormSuccess('')
                      }}
                      placeholder="e.g. NLA-LS-1234"
                    />

                    <Input
                      label="Organization"
                      value={organization}
                      onChange={(e) => {
                        setOrganization(e.target.value)
                        setFormSuccess('')
                      }}
                      placeholder="e.g. Kigali Survey Ltd"
                    />

                    <Input
                      label="Specialization"
                      value={specialization}
                      onChange={(e) => {
                        setSpecialization(e.target.value)
                        setFormSuccess('')
                      }}
                      placeholder="e.g. Cadastral, GIS Analysis"
                    />

                    <Input
                      label="Certifications"
                      value={certifications}
                      onChange={(e) => {
                        setCertifications(e.target.value)
                        setFormSuccess('')
                      }}
                      placeholder="e.g. Certified GIS Professional"
                    />
                  </div>

                  {formError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs font-bold text-rose-600">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs font-bold text-emerald-600">
                      {formSuccess}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-emerald-950/40">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 shadow-md text-xs font-bold"
                    >
                      {loading ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Side: Notification Preferences & Disclaimer */}
        <div className="space-y-6">
          <Card title="Notification Preferences">
            <div className="space-y-3 text-sm text-ink/68">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Email me when a project is assigned</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Email me when a report is generated</label>
              <label className="flex items-center gap-2"><input type="checkbox" /> Email me weekly project summaries</label>
            </div>
          </Card>
          {isAdmin && (
            <Card title="Email Configuration Status">
              <p className="text-sm leading-7 text-ink/68">SMTP delivery is enabled only when environment variables are configured. SMTP passwords are never shown in the UI.</p>
              <div className="mt-4 rounded-xl border border-warning/20 bg-warning/10 p-3 text-sm text-ink/68">
                Email service is disabled until SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM are configured.
              </div>
            </Card>
          )}
          <Card title="System Disclaimer">
            <p className="text-sm leading-7 text-ink/68">GeoSmart Manager provides preliminary planning and compliance support only. It does not replace official approval by NLA, District One Stop Centre, Irembo, or a licensed land surveyor.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
