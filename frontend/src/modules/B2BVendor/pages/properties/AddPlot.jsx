import { motion } from 'framer-motion';
import PlotForm from "../../components/PlotForm";
import SubscriptionGate from "../../components/SubscriptionGate";
import QuotaBanner from "../../components/QuotaBanner";

const AddPlot = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="px-1 text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                    Add Plot/Land
                </h1>
                <p className="text-sm text-gray-500 font-medium pb-6">
                    List a new plot of land for sale.
                </p>
                <div className="max-w-2xl mx-auto">
                    <QuotaBanner action="property" />
                </div>
            </div>

            <SubscriptionGate action="property" showLimitInfo={false} fullPage={true}>
                <PlotForm formType="Plot" />
            </SubscriptionGate>
        </motion.div>
    );
};

export default AddPlot;
