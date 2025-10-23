import { Response } from "express";
import { RequestExtendsInterface } from "../Types/types";
import Company from "../Models/Company";
import User, { IUser } from "../Models/User";
import fs from "fs";
import crypto from "crypto";
import Invitation from "../Models/Invitation";
import { sendEmail } from "../utils/sendEmail";
import mongoose, { Types } from "mongoose";
import Passwords from "../Models/Passwords"; // make sure correct model import ho
import { sendOneSignalNotification } from "../utils/oneSignalHelper";


export const registerCompany = async (
  req: RequestExtendsInterface,
  res: Response
): Promise<void> => {
  try {
    const { companyName, noOfUsers } = req.body;

    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const companyname = companyName.trim().toLowerCase();
    const userID = req.user.id;

    // 🔹 Check if user already has a company or name exists
    const existingCompany = await Company.findOne({
      $or: [{ creatorID: userID }, { companyName: companyname }],
    });
    if (existingCompany) {
      res.status(400).json({
        success: false,
        message:
          existingCompany.companyName === companyname
            ? "Company name already exists"
            : "You already have a company",
      });
      return;
    }

    // 🔹 Get next companyID
    const previousCompany = await Company.findOne().sort({ companyID: -1 });
    const nextCompanyID = previousCompany ? previousCompany.companyID + 1 : 1;

    // 🔹 Get user
    const user = await User.findById(userID);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // 🔹 Create company
    const UserLimit = process.env.COMPANY_USER_LIMIT || 10;
    const company = await Company.create({
      companyName: companyname,
      noOfUsers: noOfUsers,
      companyID: nextCompanyID,
      creatorID: userID,
      companyUserIDs: [user._id],
      companyUserLimit: UserLimit,
    });

    // 🔹 Update user companyID
    user.companyID = company._id as Types.ObjectId;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Company registered successfully",
      company,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error handling company registration",
      error,
    });
  }
};

export const uploadCompanyLogo = async (
  req: RequestExtendsInterface,
  res: Response
): Promise<void> => {
  try {
    if (!req?.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
    } else {
      const file = req?.file;
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
      } else {
        const userID = req.user.id;
        const company = await Company.findOne({ creatorID: userID });
        if (!company) {

          //delete the file that uploaded by user
          const filePath = file?.path;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);

            res.status(404).json({ success: false, message: "First register a company then upload logo" });
          }
        } else {
          if (company.companyLogo) {
            const previousLogo = company.companyLogo;
            const filePath = previousLogo;
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          company.companyLogo = file?.path || "";
          await company.save();
          res.status(200).json({
            success: true,
            message: "Company logo uploaded successfully",
            company,
          });
        }
      }
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Error uploading company logo", error });
  }
};

export const getCompany = async (
  req: RequestExtendsInterface,
  res: Response
) => {
  try {
    if (req.user) {
      const userID = req.user.id;
      const company = await Company.findOne({ creatorID: userID });
      if (!company) {
        res.status(200).json({ success: false, message: "" });
      } else {
        res.status(200).json({ success: true, message: "", data: company });
      }
    } else {
      res.status(401).json({ success: false, message: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Error getting company", error });
  }
};
// export const SendInvitation = async (
//   req: RequestExtendsInterface,
//   res: Response
// ): Promise<void> => {
//   try {

//     if (!req.user) {
//       res.status(401).json({ success: false, message: "Unauthorized" });
//       return;
//     }

//     const userID = req.user.id;
//     const findCompany = await Company.findOne({ creatorID: userID });

//     if (!findCompany) {
//       res.status(400).json({ success: false, message: "Company not found" });
//       return;
//     }

//     const checkUser = await User.findOne({ email: req.body.email });

//     if (!checkUser) {
//       res.status(400).json({
//         success: false,
//         message: "User needs to register before being invited",
//       });
//       return;
//     }

//     // Check if user is already part of the company
//     const isUserInCompany = findCompany?.companyUserIDs?.some(
//       (user) => user.toString() === checkUser._id.toString()
//     );

//     if (isUserInCompany) {
//       res.status(400).json({
//         success: false,
//         message: "User is already a member of this company",
//       });
//       return;
//     }
//     if(checkUser.companyID) {
//       res.status(400).json({
//         success: false,
//         message: "User is already part of another company",
//       });
//       return;
//     }
//     // Generate invitation token
//     const token = crypto.randomBytes(32).toString("hex");
//     const expiresAt = new Date();
//     expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

//     await Invitation.create({
//       email: req.body.email,
//       accessLevel: req.body.accessLevel,
//       companyID: findCompany._id,
//       token,
//       status: "pending",
//       expiresAt,
//       senderID: userID,
//     });

// // Backend - SendInvitation
// // const invitationUrl = `https://passure/join/${token}?company=${findCompany.companyName}`;
// const invitationUrl = `https://https://passure.vercel.app/join/${token}?company=${findCompany.companyName}`;

//     const message = `You have been invited to join ${findCompany.companyName}. Click the link below to accept the invitation:\n\n${invitationUrl}\n\nThis link will expire in 24 hours.`;

//     await sendEmail({
//       to: req.body.email,
//       subject: `Invitation to join ${findCompany.companyName}`,
//       text: message,
//     });
//     console.log("Invitation sent to:", req.body.email);
//     res
//       .status(200)
//       .json({ success: true, message: "Invitation sent successfully" });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({
//       success: false,
//       message: "Error sending invitation",
//       error: error.message,
//     });
//     return;
//   }
// };

/* ----------------------------------------------------
   ✅ Accept Invitation
---------------------------------------------------- */
export const AcceptInvitation = async (req: RequestExtendsInterface, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { token } = req.body;
    const userID = req.user.id;

    const findInvitation = await Invitation.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!findInvitation || findInvitation.status !== "pending") {
      res.status(400).json({ success: false, message: "Invitation expired or invalid" });
      return;
    }

    const user: IUser | null = await User.findById(userID);
    if (!user || user.email !== findInvitation.email) {
      res.status(403).json({ success: false, message: "Not authorized to accept this invitation" });
      return;
    }

    const findCompany = await Company.findById(findInvitation.companyID);
    if (!findCompany) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    const userIdObj = new Types.ObjectId(user._id.toString());
    if (!findCompany.companyUserIDs.includes(userIdObj)) {
      findCompany.companyUserIDs.push(userIdObj);
      await findCompany.save();

      findInvitation.status = "accepted";
      await findInvitation.save();

      user.companyID = findCompany._id as Types.ObjectId;
      await user.save();

      // ✅ Notify sender on all devices
      const sender = await User.findById(findInvitation.senderID);
      if (sender?.oneSignalPlayerIds?.length) {
        await sendOneSignalNotification({
          include_player_ids: sender.oneSignalPlayerIds.map(String),
          heading: "Invitation Accepted",
          content: `${user.fullname} accepted your invitation`,
          data: { token, type: "invite_accepted" },
          url: `passure://company/${findCompany._id}`,
        });
      }

      res.status(200).json({ success: true, message: "Invitation accepted successfully" });
    } else {
      res.status(400).json({ success: false, message: "Already member of this company" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error accepting invitation", error: error.message });
  }
};


// export const getInvitations = async (
//   req: RequestExtendsInterface,
//   res: Response
// ): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ success: false, message: "Unauthorized" });
//       return;
//     }

//     const userID = req.user.id;
//     const user = await User.findById(userID);
//     if (!user) {
//       res.status(404).json({ success: false, message: "User not found" });
//       return;
//     }

//     const invitations = await Invitation.find({
//       email: user.email,
//       status: "pending",
//       expiresAt: { $gt: new Date() } // abhi valid ho
//     }).populate("companyID", "companyName");

//     res.status(200).json({
//       success: true,
//       invitations,
//     });
//   } catch (error) {
//     console.error("Error fetching invitations:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching invitations",
//       error: error.message,
//     });
//   }
// };
/* ----------------------------------------------------
   ✅ Reject Invitation
---------------------------------------------------- */
export const RejectInvitation = async (req: RequestExtendsInterface, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { token } = req.body;
    const userID = req.user.id;

    const invitation = await Invitation.findOne({ token });
    if (!invitation || invitation.status !== "pending") {
      res.status(400).json({ success: false, message: "Invitation not found or already handled" });
      return;
    }

    const user = await User.findById(userID);
    if (!user || user.email !== invitation.email) {
      res.status(403).json({ success: false, message: "Not authorized to reject this invitation" });
      return;
    }

    invitation.status = "rejected";
    await invitation.save();

    // ✅ Notify sender on all devices
    const sender = await User.findById(invitation.senderID);
    if (sender?.oneSignalPlayerIds?.length) {
      await sendOneSignalNotification({
        include_player_ids: sender.oneSignalPlayerIds.map(String),
        heading: "Invitation Rejected",
        content: `${user.fullname} rejected your invitation`,
        data: { token, type: "invite_rejected" },
        url: `passure://company/${invitation.companyID}`,
      });
    }

    res.status(200).json({ success: true, message: "Invitation rejected successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error rejecting invitation", error: error.message });
  }
};



export const companyUsersFetch = async (
  req: RequestExtendsInterface,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return
    }

    const company = await Company.findById(id);

    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return
    }

    if (!company.companyUserIDs || company.companyUserIDs.length === 0) {
      res.status(200).json({ success: true, users: [] });
      return
    }
    const users = await User.find({
      _id: { $in: company.companyUserIDs }
    }).select('fullname username profileImg ');
    res.status(200).json({
      success: true,
      users,
    });
    return

  } catch (error) {
    console.error("Error fetching company users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching company users",
      error: error.message,
    });
  }
};


/* ----------------------------------------------------
   ✅ Send Invitation (with OneSignal multi-device support)
---------------------------------------------------- */
export const SendInvitation = async (req: RequestExtendsInterface, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const inviter = await User.findById(req.user.id);
    if (!inviter) {
      res.status(404).json({ success: false, message: "Inviter not found" });
      return;
    }

    const findCompany = await Company.findOne({ creatorID: inviter._id });
    if (!findCompany) {
      res.status(400).json({ success: false, message: "Company not found" });
      return;
    }

    const checkUser = await User.findOne({ email: req.body.email });
    if (!checkUser) {
      res.status(400).json({ success: false, message: "User needs to register before being invited" });
      return;
    }

    const existingInvitation = await Invitation.findOne({
      email: req.body.email,
      companyID: findCompany._id,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });
    if (existingInvitation) {
      res.status(400).json({ success: false, message: "User already has a pending invitation" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await Invitation.create({
      email: req.body.email,
      accessLevel: req.body.accessLevel,
      companyID: findCompany._id,
      token,
      status: "pending",
      expiresAt,
      senderID: inviter._id,
    });

    const invitationUrl = `https://passure.vercel.app/join/${token}?company=${findCompany.companyName}`;
    const message = `You have been invited to join ${findCompany.companyName}. Click here:\n\n${invitationUrl}`;

    await sendEmail({
      to: req.body.email,
      subject: `Invitation to join ${findCompany.companyName}`,
      text: message,
    });

    // ✅ Send notification to all of the receiver's devices
    if (checkUser.oneSignalPlayerIds?.length) {
      await sendOneSignalNotification({
        include_player_ids: checkUser.oneSignalPlayerIds.map(String),
        heading: `Invitation to join ${findCompany.companyName}`,
        content: `${inviter.fullname} invited you to join ${findCompany.companyName}`,
        url: `passure://invite?token=${token}`,
        data: { token, companyId: findCompany._id.toString() },
        buttons: [
          { id: "accept", text: "Accept" },
          { id: "reject", text: "Reject" },
        ],
      });
    }

    res.status(200).json({ success: true, message: "Invitation sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error sending invitation", error: error.message });
  }
};


// Delete user from company
export const DeleteUserFromCompany = async (req: RequestExtendsInterface, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.companyID) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    const company = await Company.findById(currentUser.companyID);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    if (company.creatorID.toString() === userId.toString()) {
      res.status(400).json({ success: false, message: "You cannot delete the creator of the company" });
      return;
    }

    const user = await User.findById(userId);
    if (!user || user.companyID?.toString() !== company._id.toString()) {
      res.status(400).json({ success: false, message: "User not in this company" });
      return;
    }

    // Delete user's pending invitations for this company
    await Invitation.deleteMany({ email: user.email, companyID: company._id, status: "pending" });

    user.companyID = null;
    await user.save();

    res.status(200).json({ success: true, message: "User deleted successfully" });
    return;

  } catch (error) {
    console.error("error in delete user from company", error);
    res.status(500).json({ success: false, message: "Error in delete user from company", error: error.message });
    return;
  }
};

// Get all invitations sent by company (creator)
export const getAllCompanyInvitations = async (req: RequestExtendsInterface, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userID = req.user.id;
    const company = await Company.findOne({ creatorID: userID });
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    const invitations = await Invitation.find({ companyID: company._id }).populate("companyID", "companyName");

    res.status(200).json({ success: true, invitations });
    return;

  } catch (error) {
    console.error("Error fetching company invitations:", error);
    res.status(500).json({ success: false, message: "Error fetching company invitations", error: error.message });
    return;
  }
};

// Get invitations for user
export const getInvitations = async (req: RequestExtendsInterface, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userID = req.user.id;
    const user = await User.findById(userID);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const invitations = await Invitation.find({
      email: user.email,
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
      .populate("companyID", "companyName")
      .select("email accessLevel status expiresAt token companyID"); // ✅ token add

    res.status(200).json({
      success: true,
      invitations,
    });
    return;

  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching invitations",
      error: error.message,
    });
    return;
  }
};




export const getCompanyUsersDetails = async (
  req: RequestExtendsInterface,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userID = req.user.id;

    // ✅ Current user fetch karo
    const user = await User.findById(userID);
    if (!user || !user.companyID) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    const companyID = user.companyID;

    // ✅ Company fetch karo (to get creatorID)
    const company = await Company.findById(companyID);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    // ✅ Saare users jinke companyID same hai aur creatorID ko skip karo
    const users = await User.find({
      companyID: companyID,
      _id: { $ne: company.creatorID } // creatorID skip
    }).select("_id fullname username profileImg email");

    const userDetails = users.map((u) => ({
      id: u._id,
      fullname: u.fullname,
      username: u.username,
      email: u.email,
      profileImg: u.profileImg,
      companyId: companyID,
    }));

    res.status(200).json({
      success: true,
      users: userDetails,
    });
  } catch (error) {
    console.error("Error fetching company user details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching company user details",
      error: error.message,
    });
  }
};


// Update company
export const updateCompany = async (
  req: RequestExtendsInterface,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userID = req.user.id;
    const { companyName, noOfUsers } = req.body;

    const company = await Company.findOne({ creatorID: userID });
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    if (companyName) company.companyName = companyName.trim().toLowerCase();
    if (noOfUsers) company.noOfUsers = noOfUsers;

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({
      success: false,
      message: "Error updating company",
      error: error.message,
    });
  }
};


// Delete company

export const deleteCompany = async (
  req: RequestExtendsInterface,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const userID = req.user.id;
    const company = await Company.findOne({ creatorID: userID });
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    // 🔹 Update users (companyID null) – users ko delete nahi karna
    await User.updateMany(
      { companyID: company._id },
      { $set: { companyID: null } }
    );

    // 🔹 Delete passwords linked to this company
    await Passwords.deleteMany({ companyPass: company._id });

    // 🔹 Delete invitations
    await Invitation.deleteMany({ companyID: company._id });

    // 🔹 Delete company
    await Company.findByIdAndDelete(company._id);

    res.status(200).json({
      success: true,
      message: "Company and its passwords deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting company",
      error: error.message,
    });
  }
};




