import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  ArrowLeft,
  AlertCircle,
  Building2,
} from "lucide-react";
import Navbar from "../components/Navbar";

const ContactPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 👉 Configure emails here
  const emailRecipients = {
    primary: "yash.kayaara@gmail.com",
    cc: [
      "thisishemasundar@gmail.com",
      "kamlesh.kayaara@gmail.com",
      "kamlesh041512@gmail.com",
    ],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Restrict phone to 10 digits only
    if (name === 'phone') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields (Name, Email, Message)");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // 🔥 Replace with real backend API
      // await fetch("/api/send-contact-email/", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     ...formData,
      //     recipients: emailRecipients,
      //   }),
      // });

      setTimeout(() => {
        setSubmitted(true);
        setLoading(false);

        setTimeout(() => {
          resetForm();
        }, 3000);
      }, 1500);
    } catch (err) {
      setError("Failed to send message. Please try again.");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--k-white)" }}>
      <Navbar />

      {/* Header — white band */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="k-band-white k-band-pad py-14"
      >
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="k-btn-ghost !border-none !p-0 flex items-center gap-2 mb-6 text-sm"
            style={{ color: "var(--k-grey-500)" }}
          >
            <ArrowLeft size={18} />
            <span className="font-semibold">Back</span>
          </button>

          <h1 className="text-3xl md:text-5xl font-bold text-center mb-4" style={{ color: "var(--k-ink)" }}>
            Get In <span style={{ color: "var(--k-blue)" }}>Touch</span>
          </h1>
          <p className="text-center text-sm md:text-lg" style={{ color: "var(--k-grey-500)" }}>
            We'd love to hear from you. Send us a message and we'll respond soon.
          </p>
        </div>
      </motion.div>

      {/* Main Section — grey band */}
      <div className="k-band-grey k-band-pad">
        <div className="max-w-6xl mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <div className="k-card p-6 md:p-8">
                <h3 className="k-section-title mb-6">
                  Quick Contact
                </h3>

                {/* Phone */}
                <div className="flex gap-4 items-start mb-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--k-blue-tint)" }}
                  >
                    <Phone size={20} style={{ color: "var(--k-blue)" }} />
                  </div>
                  <div>
                    <p className="k-eyebrow">Phone</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: "var(--k-ink)" }}>
                      +91 9824425888
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4 items-start mb-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--k-blue-tint)" }}
                  >
                    <Mail size={20} style={{ color: "var(--k-blue)" }} />
                  </div>
                  <div>
                    <p className="k-eyebrow">Email</p>
                    <a
                      href="mailto:jignesh@kayaara.com"
                      className="text-sm font-semibold mt-1 block hover:underline"
                      style={{ color: "var(--k-blue)" }}
                    >
                      jignesh@kayaara.com
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex gap-4 items-start">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--k-blue-tint)" }}
                  >
                    <MapPin size={20} style={{ color: "var(--k-blue)" }} />
                  </div>
                  <div>
                    <p className="k-eyebrow">Address</p>
                    <p className="text-sm font-medium leading-relaxed mt-1" style={{ color: "var(--k-grey-700)" }}>
                      A-502 Money Plant High-Street, Near BSNL Office, Jagatpur Road, Gota, Ahmedabad, 382470.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-2"
            >
              <div className="k-card p-6 md:p-8">

                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="submitted"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="text-center py-12"
                    >
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ background: "var(--k-blue-tint)" }}
                      >
                        <Send style={{ color: "var(--k-blue)" }} size={36} />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--k-ink)" }}>
                        Thank You!
                      </h3>
                      <p className="mb-6 text-base md:text-lg" style={{ color: "var(--k-grey-500)" }}>
                        Your message has been received successfully.
                      </p>
                      <button
                        onClick={() => {
                          resetForm();
                          navigate("/");
                        }}
                        className="k-btn-primary"
                      >
                        Go to Home
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-5"
                    >
                      {["name", "email", "phone", "subject"].map((field) => (
                        <div key={field}>
                          <label className="k-label capitalize">
                            {field}
                            {(field === "name" || field === "email") && (
                              <span style={{ color: "var(--k-blue)" }}> *</span>
                            )}
                          </label>
                          <input
                            type={field === "email" ? "email" : "text"}
                            name={field}
                            value={formData[field]}
                            onChange={handleChange}
                            maxLength={field === "phone" ? "10" : undefined}
                            placeholder={field === "phone" ? "10 digits max" : ""}
                            className="k-input"
                          />
                          {field === "phone" && (
                            <p className="text-xs mt-1 italic" style={{ color: "var(--k-grey-500)" }}>
                              Maximum 10 digits allowed
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Message */}
                      <div>
                        <label className="k-label">
                          Message <span style={{ color: "var(--k-blue)" }}>*</span>
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows="5"
                          className="k-textarea resize-none"
                        />
                      </div>

                      {error && (
                        <div
                          className="p-4 rounded-lg border flex items-center gap-2"
                          style={{ background: "var(--k-blue-tint)", borderColor: "var(--k-grey-200)" }}
                        >
                          <AlertCircle size={18} style={{ color: "var(--k-blue)" }} />
                          <p className="text-sm font-semibold" style={{ color: "var(--k-ink)" }}>
                            {error}
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="k-btn-primary w-full"
                      >
                        {loading ? "Sending..." : "Send Message"}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
