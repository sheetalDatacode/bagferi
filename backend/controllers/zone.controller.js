import Zone from '../models/Zone.model.js';

/**
 * @desc    Create a new Zone
 * @route   POST /api/zones/admin
 * @access  Private/Admin
 */
export const createZone = async (req, res) => {
    try {
        const { name, city, pincode, area, market, isActive } = req.body;

        // Check if a zone with the same name already exists
        const existingZone = await Zone.findOne({ name });
        if (existingZone) {
            return res.status(400).json({
                success: false,
                message: 'A zone with this name already exists'
            });
        }

        const zone = await Zone.create({
            name,
            city: city || 'Surat',
            pincode,
            area,
            market,
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json({
            success: true,
            data: zone,
            message: 'Zone created successfully'
        });
    } catch (error) {
        console.error('Error in createZone:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create zone'
        });
    }
};

/**
 * @desc    Get all Zones (Admin)
 * @route   GET /api/zones/admin
 * @access  Private/Admin
 */
export const getAllZonesAdmin = async (req, res) => {
    try {
        const zones = await Zone.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: zones
        });
    } catch (error) {
        console.error('Error in getAllZonesAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch zones'
        });
    }
};

/**
 * @desc    Get active Zones (Public/Vendor)
 * @route   GET /api/zones/public/active
 * @access  Public
 */
export const getActiveZones = async (req, res) => {
    try {
        // Find all active zones
        const zones = await Zone.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: zones
        });
    } catch (error) {
        console.error('Error in getActiveZones:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active zones'
        });
    }
};

/**
 * @desc    Update a Zone
 * @route   PUT /api/zones/admin/:id
 * @access  Private/Admin
 */
export const updateZone = async (req, res) => {
    try {
        const { name, city, pincode, area, market, isActive } = req.body;

        let zone = await Zone.findById(req.params.id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        // If name is changing, check for duplicates
        if (name && name !== zone.name) {
            const existingZone = await Zone.findOne({ name });
            if (existingZone) {
                return res.status(400).json({
                    success: false,
                    message: 'Another zone with this name already exists'
                });
            }
        }

        zone.name = name || zone.name;
        zone.city = city || zone.city;
        zone.pincode = pincode || zone.pincode;
        zone.area = area || zone.area;
        zone.market = market || zone.market;
        if (isActive !== undefined) {
            zone.isActive = isActive;
        }

        await zone.save();

        res.status(200).json({
            success: true,
            data: zone,
            message: 'Zone updated successfully'
        });
    } catch (error) {
        console.error('Error in updateZone:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update zone'
        });
    }
};

/**
 * @desc    Delete a Zone
 * @route   DELETE /api/zones/admin/:id
 * @access  Private/Admin
 */
export const deleteZone = async (req, res) => {
    try {
        const zone = await Zone.findById(req.params.id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        await zone.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Zone deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteZone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete zone'
        });
    }
};
