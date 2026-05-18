<details>
  <summary>What is a Community and why does the tier matter?</summary>

  A Community is an on-chain group with its own identity, members, and badge system, identified by a unique ID. Each community is classified by tier: Gold, Silver, Bronze, or Unaffiliated. New communities start as Unaffiliated until they qualify for a higher tier. The tier signals credibility and visibility on the platform — it's how communities are sorted and filtered, and it directly affects how discoverable your community is to potential members.
</details>

<details>
  <summary>How do I create a community and bring it on-chain?</summary>

  Click Create Community on the Communities page. The flow has 3 steps: Community Info (name, description, logo) → Badge Details (Manager, Assistant, Member badge images and optional JSON metadata) → Review. When you click Finish, metadata uploads to IPFS and you sign a transaction. The community exists on-chain only after that transaction confirms — until then, nothing is created.
</details>

<details>
  <summary>What are the Manager, Assistant, and Member badges, and how do I assign them?</summary>

  Every community automatically mints three role badges that define on-chain permissions:

  - **Manager**: full admin control. There is only one Manager per community (the creator by default). The role is unique and can only change hands via Transfer Ownership in Settings — it cannot be minted to multiple addresses.
  - **Assistant**: delegated rights to help manage. Can be assigned to multiple addresses.
  - **Member**: standard membership. Can be assigned to any number of addresses.

  To assign Assistant or Member badges, go to the Members tab → Actions panel, pick the badge type, choose Mint, select Single or Batch (batch mints multiple recipients in one transaction, saving gas), enter the wallet address or username, and click Mint Badge. This is how you grow your community and delegate operational responsibility.
</details>

<details>
  <summary>How do I remove a member or revoke a role?</summary>

  From the Members tab, you have two options:

  - **Revoke**: removes the member from the community (shown next to each member row)
  - **Burn**: permanently destroys the badge token

  Use Revoke for routine removals and Burn when you need to permanently invalidate a badge. Both are on-chain actions and require a transaction.
</details>

<details>
  <summary>Can I edit the community or transfer ownership later?</summary>

  Yes, from the Settings tab. You can update name, description, and logo via Edit Info, and modify each badge's image and metadata via its Edit button. The Danger Zone has a Transfer Ownership action that hands the Manager role to another address — use it carefully, because once transferred you lose admin control. There is no delete option: communities are permanent on-chain records.
</details>

<details>
  <summary>How do I track activity and prove what happened on-chain?</summary>

  The Overview tab shows a Recent Activity feed with community creation, badges created, badges minted, and member joins, each timestamped with a link to the on-chain transaction. This gives you (and any auditor, partner, or member) verifiable proof of every action — critical for trust, compliance, and demonstrating community growth. Click Load More Activities for full history.
</details>
