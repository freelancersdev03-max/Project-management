import React, { useState, useEffect } from 'react';
import {
    X, User, Mail, Lock, Building2, Phone, Globe,
    ImageIcon, Sparkles, ChevronRight, ChevronLeft,
    Users, Briefcase, ShieldCheck
} from 'lucide-react';
import api from '../../api';
import emailjs from '@emailjs/browser';

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;

const getEmptyFormData = () => ({
    username: '',
    email: '',
    password: '',
    company_name: '',
    contact_email: '',
    phone: '',
    website: '',
    address: '',
    logo: null,
    assigned_sgms: [],
    assigned_kayaara_users: [],
    internal_team: []
});

const normalizeIdList = (values) => {
    if (!Array.isArray(values)) return [];
    return values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
};

const buildFormDataFromClient = (clientData = {}) => {
    const assignedSgmIds = Array.isArray(clientData.assigned_sgms_details)
        ? normalizeIdList(clientData.assigned_sgms_details.map((user) => user?.id))
        : normalizeIdList(clientData.assigned_sgms);

    const internalTeamIds = Array.isArray(clientData.internal_team_details)
        ? normalizeIdList(clientData.internal_team_details.map((user) => user?.id))
        : normalizeIdList(clientData.internal_team);

    const assignedKayaaraIds = Array.isArray(clientData.assigned_kayaara_users_details)
        ? normalizeIdList(clientData.assigned_kayaara_users_details.map((user) => user?.id))
        : normalizeIdList(clientData.assigned_kayaara_users);

    return {
        ...getEmptyFormData(),
        username: clientData.username || '',
        email: clientData.email || '',
        company_name: clientData.company_name || '',
        contact_email: clientData.contact_email || clientData.email || '',
        phone: clientData.phone || '',
        website: clientData.website || '',
        address: clientData.address || '',
        assigned_sgms: assignedSgmIds,
        assigned_kayaara_users: assignedKayaaraIds,
        internal_team: internalTeamIds,
    };
};

const CreateWorkspaceModal = ({ isOpen, onClose, onClientCreated, initialData }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const isEditMode = !!initialData;

    const [formData, setFormData] = useState(getEmptyFormData());

    const [sgmOptions, setSgmOptions] = useState([]);
    const [kayaaraOptions, setKayaaraOptions] = useState([]);
    const [employeeOptions, setEmployeeOptions] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const fetchOptions = async () => {
            try {
                const [sgmRes, kayaaraRes, empRes] = await Promise.all([
                    api.get('admin/users/?role=SGM', { headers }),
                    api.get('admin/users/?role=KAYAARA', { headers }),
                    api.get('admin/users/?role=EMPLOYEE', { headers })
                ]);

                const formatUser = (user) => {
                    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
                    return {
                        id: Number(user.id),
                        name: name ? `${name} (${user.email})` : `${user.username} (${user.email})`
                    };
                };

                if (!isCancelled) {
                    setSgmOptions(sgmRes.data.map(formatUser));
                    setKayaaraOptions(kayaaraRes.data.map(formatUser));
                    setEmployeeOptions(empRes.data.map(formatUser));
                }
            } catch (error) {
                console.error('Failed to fetch options', error);
            }
        };

        const hydrateForm = async () => {
            setStep(1);

            if (!initialData) {
                if (!isCancelled) {
                    setFormData(getEmptyFormData());
                    setLogoPreview(null);
                }
                return;
            }

            let sourceClient = initialData;
            try {
                const detailRes = await api.get(`clients/${initialData.id}/`, { headers });
                sourceClient = {
                    ...initialData,
                    ...(detailRes.data || {}),
                };
            } catch (error) {
                console.error('Failed to fetch full client details for edit modal', error);
            }

            if (!isCancelled) {
                setFormData(buildFormDataFromClient(sourceClient));
                setLogoPreview(sourceClient.logo || null);
            }
        };

        Promise.all([fetchOptions(), hydrateForm()]);

        return () => {
            isCancelled = true;
        };
    }, [initialData, isOpen]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, logo: file });
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const nextStep = () => setStep((p) => p + 1);
    const prevStep = () => setStep((p) => p - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step < 3) return nextStep();

        setLoading(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'internal_team') {
                formData[key].forEach(val => data.append('internal_team', val));
            } else if (key === 'assigned_sgms') {
                formData[key].forEach(val => data.append('assigned_sgms', val));
} else if (key === 'assigned_kayaara_users') {
                    formData[key].forEach(val => data.append('assigned_kayaara_users', val));
            } else if (key === 'logo' && typeof formData[key] === 'string') {
                // Do not append existing logo URL, backend expects File
            } else if (formData[key] !== null && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        if (isEditMode && !formData.password) data.delete("password");

        try {
            const token = localStorage.getItem('access_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            if (isEditMode) {
                await api.put(`clients/${initialData.id}/`, data, { headers });
            } else {
                await api.post('clients/create/', data, { headers });

                // Send credentials email to new client
                try {
                    await emailjs.send(
                        EMAILJS_SERVICE_ID,
                        EMAILJS_TEMPLATE_ID,
                        {
                            to_email: formData.email,
                            to_name: formData.company_name || formData.username,
                            username: formData.username,
                            password: formData.password,
                            role: 'CLIENT',
                            first_name: formData.company_name || formData.username,
                            last_name: '',
                            shortform: '',
                        },
                        EMAILJS_PUBLIC_KEY
                    );
                } catch (emailErr) {
                    console.error('EmailJS Error:', emailErr);
                    alert('Client created successfully, but credential email could not be sent.');
                }
            }
            onClientCreated();
            onClose();
        } catch (error) {
            console.error(error.response?.data);
            alert("Error: " + JSON.stringify(error.response?.data || "Server error"));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="k-backdrop" onClick={onClose} style={{ fontFamily: 'Poppins, sans-serif' }}>
            <div className="k-modal max-w-3xl" onClick={(e) => e.stopPropagation()}>

                {/* Step Indicator */}
                <div className="flex h-1.5 w-full shrink-0" style={{ background: 'var(--k-grey-100)' }}>
                    <div
                        className={`h-full transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}
                        style={{ background: 'var(--k-blue)' }}
                    />
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 md:p-8 k-scroll">
                    <div className="mb-6 flex items-start justify-between gap-4 md:mb-8">
                        <div>
                            <span className="k-eyebrow" style={{ color: 'var(--k-blue)' }}>Step 0{step} / 03</span>
                            <h2 className="text-xl md:text-2xl font-bold mt-1" style={{ color: 'var(--k-ink)' }}>
                                {step === 1 && <>Client <span style={{ color: 'var(--k-blue)' }}>Credentials</span></>}
                                {step === 2 && <>Company <span style={{ color: 'var(--k-blue)' }}>Information</span></>}
                                {step === 3 && <>Team <span style={{ color: 'var(--k-blue)' }}>Assignments</span></>}
                            </h2>
                        </div>
                        <button onClick={onClose} className="k-btn-icon" aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">

                        {/* STEP 1: CREDENTIALS */}
                        {step === 1 && (
                            <div className="space-y-4 k-fade-up">
                                <ModalInput icon={User} label="Username" placeholder="Enter username" value={formData.username} onChange={(v) => setFormData({ ...formData, username: v })} disabled={isEditMode} />
                                <ModalInput icon={Mail} label="Email Address" placeholder="client@company.com" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v, contact_email: v })} />
                                <ModalInput icon={Lock} label={isEditMode ? "New Password (Optional)" : "Password"} type="password" placeholder="••••••••" value={formData.password} onChange={(v) => setFormData({ ...formData, password: v })} required={!isEditMode} />
                            </div>
                        )}

                        {/* STEP 2: COMPANY INFO */}
                        {step === 2 && (
                            <div className="space-y-4 k-fade-up">
                                <ModalInput icon={Building2} label="Company Name" placeholder="e.g. Acme Corp" value={formData.company_name} onChange={(v) => setFormData({ ...formData, company_name: v })} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ModalInput
                                        icon={Phone}
                                        label="Phone Number"
                                        placeholder="10 digits max"
                                        value={formData.phone}
                                        onChange={(v) => {
                                            // Allow only digits and limit to 10 characters
                                            const digitsOnly = v.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, phone: digitsOnly });
                                        }}
                                    />
                                    <ModalInput icon={Globe} label="Website" placeholder="www.acme.com" value={formData.website} onChange={(v) => setFormData({ ...formData, website: v })} />
                                </div>
                                <div>
                                    <label className="k-label">Office Address</label>
                                    <textarea
                                        className="k-textarea"
                                        rows="2"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'var(--k-band-grey)', border: '1px dashed var(--k-grey-300)' }}>
                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'var(--k-white)', border: '1px solid var(--k-grey-200)' }}>
                                        {logoPreview ? <img src={logoPreview} className="object-cover h-full w-full" alt="logo" /> : <ImageIcon style={{ color: 'var(--k-grey-300)' }} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="k-eyebrow">Company Logo</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="text-[10px] mt-1 block w-full cursor-pointer file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:text-white file:bg-[color:var(--k-blue)]"
                                            style={{ color: 'var(--k-grey-500)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ASSIGNMENTS */}
                        {step === 3 && (
                            <div className="space-y-4 k-fade-up">
                                <ModalSelect
                                    icon={Briefcase}
                                    label="Assign SGM"
                                    multiple
                                    singleSelect
                                    options={sgmOptions}
                                    value={formData.assigned_sgms}
                                    onChange={(v) => setFormData({ ...formData, assigned_sgms: normalizeIdList(v) })}
                                />
                                <ModalSelect
                                    icon={ShieldCheck}
                                    label="Assign KAYAARA"
                                    multiple
                                    options={kayaaraOptions}
                                    value={formData.assigned_kayaara_users}
                                    onChange={(v) => setFormData({ ...formData, assigned_kayaara_users: normalizeIdList(v) })}
                                />
                                <ModalSelect
                                    icon={Users}
                                    label="Internal Team Members"
                                    multiple
                                    options={employeeOptions}
                                    value={formData.internal_team}
                                    onChange={(v) => setFormData({ ...formData, internal_team: normalizeIdList(v) })}
                                />
                                <div className="p-4 rounded-2xl" style={{ background: 'var(--k-blue-tint)', border: '1px solid var(--k-blue-tint)' }}>
                                    <p className="text-[11px] font-semibold leading-relaxed" style={{ color: 'var(--k-blue)' }}>
                                        Finalizing this step will deploy the workspace environment and send login credentials to the client.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="sticky bottom-0 -mx-4 px-4 py-4 sm:-mx-5 sm:px-5 md:-mx-8 md:px-8" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(6px)', borderTop: '1px solid var(--k-grey-200)' }}>
                            <div className="flex gap-3">
                                {step > 1 && (
                                    <button type="button" onClick={prevStep} className="k-btn-ghost flex-1 min-h-[44px] flex items-center justify-center gap-2 text-sm">
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="k-btn-primary flex-2 min-h-[44px] flex items-center justify-center gap-2 text-sm"
                                >
                                    {loading ? 'Processing...' : (
                                        <>
                                            {step === 3 ? (isEditMode ? 'Update Workspace' : 'Finish & Deploy') : 'Continue'}
                                            {step < 3 ? <ChevronRight size={16} /> : <Sparkles size={16} />}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Sub-components
const ModalInput = ({ icon: Icon, label, value, onChange, type = "text", placeholder, disabled, required, maxLength }) => (
    <div className={disabled ? 'opacity-50' : ''}>
        <label className="k-label">{label}</label>
        <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-300)' }} size={16} />
            <input
                required={required} type={type} disabled={disabled} placeholder={placeholder}
                maxLength={maxLength}
                className="k-input"
                style={{ paddingLeft: '2.4rem' }}
                value={value} onChange={(e) => onChange(e.target.value)}
            />
        </div>
    </div>
);

const ModalSelect = ({ icon: Icon, label, options, value, onChange, multiple, singleSelect }) => {
    const normalizedValue = normalizeIdList(value);

    return (
        <div>
            <label className="k-label">{label}</label>

            {multiple ? (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1 k-scroll">
                        {options.length === 0 ? (
                            <div className="p-3 text-[11px] font-semibold text-center" style={{ color: 'var(--k-grey-500)' }}>No options available</div>
                        ) : (
                            options.map(opt => {
                                const optionId = Number(opt.id);
                                const isSelected = normalizedValue.includes(optionId);

                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => {
                                            const newValue = singleSelect
                                                ? (isSelected ? [] : [optionId])
                                                : (isSelected
                                                    ? normalizedValue.filter(v => v !== optionId)
                                                    : [...normalizedValue, optionId]);
                                            onChange(newValue);
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                                        style={isSelected
                                            ? { background: 'var(--k-white)', border: '1px solid var(--k-blue)', boxShadow: 'var(--k-shadow-card)' }
                                            : { border: '1px solid transparent' }}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-md flex items-center justify-center transition-all shrink-0"
                                            style={isSelected
                                                ? { background: 'var(--k-blue)', border: '1px solid var(--k-blue)', color: 'var(--k-white)' }
                                                : { background: 'var(--k-white)', border: '1px solid var(--k-grey-300)' }}
                                        >
                                            {isSelected && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className="text-[11px] font-semibold" style={{ color: isSelected ? 'var(--k-ink)' : 'var(--k-grey-500)' }}>
                                            {opt.name}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-300)' }} size={16} />
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="k-select"
                        style={{ paddingLeft: '2.4rem' }}
                    >
                        <option value="">Select Option</option>
                        {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
};

export default CreateWorkspaceModal;
