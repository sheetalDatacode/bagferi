import LotSlotForm from "../../components/LotSlotForm";
import { motion } from 'framer-motion';
import SubscriptionGate from "../../components/SubscriptionGate";
import QuotaBanner from "../../components/QuotaBanner";
import useSubscriptionStore from "../../store/subscriptionStore";

const AddLotSlot = () => {
    const { status, canCreateLotSlot } = useSubscriptionStore();
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto space-y-6"
        >
            <div className="flex justify-end px-1">
                {/* Dynamic Quota Badge */}
                {status?.limits?.lotSlot && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Available Quota</span>
                        <span className="text-sm font-bold text-indigo-700">
                            {canCreateLotSlot().remaining === -1 
                                ? 'Unlimited' 
                                : `${canCreateLotSlot().remaining} Lots Left`}
                        </span>
                    </div>
                )}
            </div>

            <QuotaBanner action="lotslot" />

            <SubscriptionGate action="lotslot" showLimitInfo={false} fullPage={true}>
                <LotSlotForm isEdit={false} />
            </SubscriptionGate>
        </motion.div>
    );
};

export default AddLotSlot;
