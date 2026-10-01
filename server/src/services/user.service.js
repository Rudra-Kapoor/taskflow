import { User } from '../models/index.js';
import { USER_PUBLIC_FIELDS } from '../utils/constants.js';
import { containsRegex } from '../utils/query.js';
import { getTeammateIds, loadTeamForMember } from './access.service.js';

const MAX_RESULTS = 8;

/**
 * Finds people to add to a team. Partial name / email matches only cover people who already
 * share a team with the requester; anyone else is only found by their exact email address
 * (case-insensitive), so the user directory cannot be harvested. An exact email match comes
 * first, then matching teammates by name. Never returns the requester; with `excludeTeam`
 * (a team the requester belongs to) its current members are hidden too.
 */
export async function searchUsers(viewer, { q, excludeTeam }) {
  const excludedIds = [viewer._id];
  if (excludeTeam) {
    const team = await loadTeamForMember(excludeTeam, viewer._id);
    excludedIds.push(...team.members.map((member) => member.user));
  }

  const teammateIds = await getTeammateIds(viewer._id);
  const notExcluded = { $nin: excludedIds };
  const pattern = containsRegex(q);
  const [exactMatch, teammates] = await Promise.all([
    // Emails are stored lower-cased, so this case-insensitive lookup uses the unique index.
    User.findOne({ _id: notExcluded, email: q.toLowerCase() }).select(USER_PUBLIC_FIELDS),
    User.find({
      _id: { ...notExcluded, $in: teammateIds },
      $or: [{ name: pattern }, { email: pattern }],
    })
      .select(USER_PUBLIC_FIELDS)
      .collation({ locale: 'en', strength: 2 })
      .sort({ name: 1 })
      .limit(MAX_RESULTS),
  ]);

  if (!exactMatch) return teammates;
  const others = teammates.filter((user) => !user._id.equals(exactMatch._id));
  return [exactMatch, ...others].slice(0, MAX_RESULTS);
}
