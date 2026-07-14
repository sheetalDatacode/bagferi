import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import PropertyForm from "../../components/PropertyForm";
import FlatForm from "../../components/FlatForm";
import PlotForm from "../../components/PlotForm";

function getPropertyBucket(property) {
    const type = String(property?.propertyType || "").toLowerCase();
    if (type === "flat") return "flat";
    if (type === "villa" || type === "plot") return "villa";
    const commercialTypes = ["shop", "office", "showroom", "godown", "factory", "commercial building"];
    if (commercialTypes.includes(type) || type === "commercial" || type === "property") return "commercial";
    if (property?.plotDetails?.plotArea > 0) return "villa";
    if (property?.flatDetails?.carpetArea > 0) return "flat";
    return "commercial";
}

const EditProperty = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [propertyData, setPropertyData] = useState(null);

    useEffect(() => {
        fetchProperty();
    }, [id]);

    const fetchProperty = async () => {
        try {
            const response = await api.get(`/property/details/${id}`);
            if (response.success) {
                setPropertyData(response.data);
            }
        } catch (error) {
            toast.error("Failed to load property details");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 font-bold text-gray-400">Loading details...</div>;
    if (!propertyData) return <div className="text-center py-20 font-bold text-gray-400">Property not found</div>;

    const bucket = getPropertyBucket(propertyData);
    if (bucket === "flat") return <FlatForm initialData={propertyData} isEdit={true} />;
    if (bucket === "villa") return <PlotForm initialData={propertyData} isEdit={true} formType="Row house / Villa" />;
    return <PropertyForm initialData={propertyData} isEdit={true} />;
};

export default EditProperty;
