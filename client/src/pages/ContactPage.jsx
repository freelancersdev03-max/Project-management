import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    primary: "yash.hqepl@gmail.com",
    cc: [
      "thisishemasundar@gmail.com",
      "kamlesh.hqepl@gmail.com",
      "kamlesh041512@gmail.com",
    ],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-sky-800 via-blue-600 to-sky-800 text-white py-14">
        <div className="max-w-6xl mx-auto px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-blue-100 hover:text-white transition mb-6"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-semibold">Back</span>
          </button>

          <h1 className="text-4xl md:text-5xl font-black text-center mb-4">
            Get In Touch
          </h1>
          <p className="text-blue-100 text-lg text-center">
            We'd love to hear from you. Send us a message and we’ll respond soon.
          </p>
        </div>
      </div>

      {/* Main Section */}
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Sidebar */}
          <div className="space-y-6">

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <h3 className="text-xl font-black text-slate-900 mb-6">
                Quick Contact
              </h3>

              {/* Email */}
              <div className="flex gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 size={24} className="text-blue-600 w-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    401, Sahyog Elina Above Reliance Digital VIP Road Karelibaugh beside Tanishq Karelibaugh Vadodara 390018 Gujarat
                  </p>
                </div>
              </div>
              {/* Phone Section */}
              <div className="space-y-6">

                {/* Phone 1 */}
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Phone
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      +91 98240 11121
                    </p>
                  </div>
                </div>

                {/* Phone 2 */}
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Phone
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      +91 97390 12006
                    </p>
                  </div>
                </div>

                {/* Phone 3 */}
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Phone
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      +91 94276 11123
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">

              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Send className="text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-3">
                    Thank You!
                  </h3>
                  <p className="text-slate-600 mb-6 text-lg">
                    Your message has been received successfully.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      navigate("/");
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-sky-800 via-blue-600 to-sky-800 text-white rounded-lg font-bold hover:opacity-90 transition"
                  >
                    Go to Home
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">

                  {["name", "email", "phone", "subject"].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-bold text-slate-900 mb-2 capitalize">
                        {field}
                        {(field === "name" || field === "email") && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>
                      <input
                        type={field === "email" ? "email" : "text"}
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="5"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm font-semibold flex items-center gap-2">
                        <AlertCircle size={18} />
                        {error}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-4 bg-gradient-to-r from-sky-800 via-blue-600 to-sky-800 text-white font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
